import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";

const db = new PGlite();
const uid = "10000000-0000-0000-0000-000000000001";
let seq = 10;
const requestId = () => `10000000-0000-0000-0000-${String(seq++).padStart(12, "0")}`;
beforeAll(async () => {
  await db.exec(`CREATE SCHEMA auth; CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role'::text $$;
    CREATE TABLE auth.users(id uuid, email text, raw_user_meta_data jsonb);
    CREATE TABLE profiles(id uuid PRIMARY KEY,email text,full_name text);
    CREATE TABLE user_roles(user_id uuid,role text);
    CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE subscriptions(user_id uuid PRIMARY KEY,status text,plan text,trial_ends_at timestamptz,current_period_start timestamptz,current_period_end timestamptz,payment_method text,canceled_at timestamptz);
    CREATE TABLE pix_payment_requests(id uuid PRIMARY KEY,user_id uuid,plan text,status text,decided_at timestamptz,decided_by uuid);
    CREATE TABLE bulletins(id uuid DEFAULT gen_random_uuid(),status text,content text); CREATE TABLE bulletin_presets(id uuid);`);
  for (const file of ["0003_free_trial_and_atomic_pix_access.sql", "0005_renewal_balance_and_nonempty_bulletins.sql"]) {
    await db.exec(readFileSync(new URL(`../../drizzle/migrations/${file}`, import.meta.url), "utf8"));
  }
});
afterAll(() => db.close());
async function subscription(plan: string, days: number) {
  await db.exec(`INSERT INTO subscriptions(user_id,status,plan,current_period_start,current_period_end,payment_method) VALUES('${uid}','active','${plan}',now(),now()+interval '${days} days','${plan === "mensal" ? "pix" : "admin"}') ON CONFLICT(user_id) DO UPDATE SET status='active',plan=EXCLUDED.plan,current_period_start=now(),current_period_end=EXCLUDED.current_period_end,payment_method=EXCLUDED.payment_method;`);
}
async function approve() {
  const id = requestId();
  await db.exec(`INSERT INTO pix_payment_requests VALUES('${id}','${uid}','mensal','aguardando_aprovacao',NULL,NULL); SELECT approve_pix_payment_request('${id}');`);
  return id;
}
async function daysLeft() {
  const result = await db.query<{ days: number }>(`SELECT extract(epoch FROM(current_period_end-now()))/86400 AS days FROM subscriptions WHERE user_id='${uid}'`);
  return Number(result.rows[0]?.days);
}
it("renovação antecipada com 10 dias soma 30 e mantém 40 dias", async () => {
  await subscription("mensal", 10);
  const id = await approve();
  expect(await daysLeft()).toBeCloseTo(40, 4);
  expect((await db.query<{ access: boolean }>(`SELECT is_premium_user('${uid}') AS access`)).rows[0]?.access).toBe(true);
  const before = await daysLeft();
  await expect(db.exec(`SELECT approve_pix_payment_request('${id}')`)).rejects.toThrow("já foi processada");
  expect(await daysLeft()).toBeCloseTo(before, 4);
});
it("assinatura vencida recebe 30 dias a partir da aprovação", async () => {
  await subscription("mensal", -10); await approve(); expect(await daysLeft()).toBeCloseTo(30, 4);
});
it("cortesia com prazo preserva seus 10 dias ao receber Pix", async () => {
  await subscription("premium", 10); await approve(); expect(await daysLeft()).toBeCloseTo(40, 4);
});
it("aprovação Pix não reduz nem troca acesso vitalício", async () => {
  await subscription("vitalicio", 36500);
  const before = (await db.query(`SELECT * FROM subscriptions WHERE user_id='${uid}'`)).rows;
  await approve();
  expect((await db.query(`SELECT * FROM subscriptions WHERE user_id='${uid}'`)).rows).toEqual(before);
});
it("teste free não adiciona saldo de teste ao pagamento", async () => {
  await subscription("free", 1); await approve(); expect(await daysLeft()).toBeCloseTo(30, 4);
});
it("duas aprovações distintas acumulam dois períodos, sem sobrescrever saldo", async () => {
  await subscription("mensal", 10); await approve(); await approve(); expect(await daysLeft()).toBeCloseTo(70, 4);
});
it("falha ao marcar pagamento aprovado reverte a renovação", async () => {
  await subscription("mensal", 10);
  await db.exec(`CREATE FUNCTION fail_approval_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$; CREATE TRIGGER fail_approval BEFORE UPDATE ON pix_payment_requests FOR EACH ROW EXECUTE FUNCTION fail_approval_test();`);
  try { await expect(approve()).rejects.toThrow("falha simulada"); expect(await daysLeft()).toBeCloseTo(10, 4); }
  finally { await db.exec("DROP TRIGGER fail_approval ON pix_payment_requests;"); }
});
it("banco bloqueia conclusão vazia, mas mantém rascunhos e registros anteriores", async () => {
  for (const content of ["", "  ", "Título do Boletim: Teste\nHISTÓRICO / VERSÃO POLICIAL\n{RELATO}\nPERGUNTAS COMPLEMENTARES:\nO que ocorreu?"]) {
    await expect(db.query("INSERT INTO bulletins(status,content) VALUES('done',$1)", [content])).rejects.toThrow("histórico");
  }
  await db.exec(`INSERT INTO bulletins(status,content) VALUES('draft','');`);
  await expect(db.exec("UPDATE bulletins SET status='done' WHERE status='draft' AND content=''")).rejects.toThrow("histórico");
  await db.exec(`INSERT INTO bulletins(status,content) VALUES('done','A vítima relatou o furto da bicicleta.'); UPDATE bulletins SET content=content WHERE status='done';`);
  await expect(db.exec("UPDATE bulletins SET content='' WHERE status='done'")).rejects.toThrow("histórico");
});