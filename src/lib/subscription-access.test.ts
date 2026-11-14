import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const user = "00000000-0000-0000-0000-000000000001";
const request = "00000000-0000-0000-0000-000000000002";
beforeAll(async () => {
  await db.exec(`CREATE SCHEMA auth;
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role'::text $$;
    CREATE TABLE auth.users(id uuid, email text, raw_user_meta_data jsonb);
    CREATE TABLE profiles(id uuid PRIMARY KEY,email text,full_name text);
    CREATE TABLE user_roles(user_id uuid,role text);
    CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE subscriptions(user_id uuid PRIMARY KEY,status text,plan text,trial_ends_at timestamptz,current_period_start timestamptz,current_period_end timestamptz,payment_method text,canceled_at timestamptz);
    CREATE TABLE pix_payment_requests(id uuid PRIMARY KEY,user_id uuid,plan text,status text,decided_at timestamptz,decided_by uuid);
    CREATE TABLE bulletins(id uuid); CREATE TABLE bulletin_presets(id uuid);`);
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0003_free_trial_and_atomic_pix_access.sql", import.meta.url), "utf8"));
  await db.exec(`CREATE TRIGGER signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();`);
});
afterAll(() => db.close());

it("cada conta nasce free com exatamente 24 horas de teste", async () => {
  await db.exec(`INSERT INTO auth.users VALUES ('${user}','test@example.invalid','{}');`);
  const { rows } = await db.query<{ plan: string; hours: number }>(`SELECT plan,extract(epoch FROM (trial_ends_at-current_period_start))/3600 AS hours FROM subscriptions WHERE user_id='${user}'`);
  expect(rows[0]?.plan).toBe("free");
  expect(Number(rows[0]?.hours)).toBe(24);
});

it("teste vencido e Pix pendente não liberam ferramentas; aprovação libera por 30 dias", async () => {
  await db.exec(`UPDATE subscriptions SET trial_ends_at=now()-interval '1 hour',current_period_end=now()-interval '1 hour' WHERE user_id='${user}'; INSERT INTO pix_payment_requests(id,user_id,plan,status) VALUES('${request}','${user}','mensal','aguardando_aprovacao');`);
  const access = async () => (await db.query<{ allowed: boolean }>(`SELECT is_premium_user('${user}') AS allowed`)).rows[0]?.allowed;
  expect(await access()).toBe(false);
  await db.exec(`SELECT approve_pix_payment_request('${request}');`);
  expect(await access()).toBe(true);
  const { rows } = await db.query<{ days: number; status: string }>(`SELECT extract(epoch FROM(s.current_period_end-s.current_period_start))/86400 AS days,r.status FROM subscriptions s JOIN pix_payment_requests r ON r.user_id=s.user_id WHERE r.id='${request}'`);
  expect(Number(rows[0]?.days)).toBe(30);
  expect(rows[0]?.status).toBe("aprovado");
  await expect(db.exec(`SELECT approve_pix_payment_request('${request}')`)).rejects.toThrow("já foi processada");
});

it("falha na aprovação reverte a ativação da assinatura", async () => {
  const id = "00000000-0000-0000-0000-000000000003";
  await db.exec(`UPDATE subscriptions SET plan='free',status='canceled',current_period_end=now()-interval '1 hour' WHERE user_id='${user}'; INSERT INTO pix_payment_requests(id,user_id,plan,status) VALUES('${id}','${user}','mensal','aguardando_aprovacao'); CREATE FUNCTION fail_approval() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated failure'; END $$; CREATE TRIGGER fail BEFORE UPDATE ON pix_payment_requests FOR EACH ROW EXECUTE FUNCTION fail_approval();`);
  await expect(db.exec(`SELECT approve_pix_payment_request('${id}')`)).rejects.toThrow("simulated failure");
  expect((await db.query<{ allowed: boolean }>(`SELECT is_premium_user('${user}') AS allowed`)).rows[0]?.allowed).toBe(false);
});

it("cupons e cortesias premium ou vitalícios continuam válidos", async () => {
  for (const plan of ["premium", "vitalicio"]) {
    await db.exec(`UPDATE subscriptions SET plan='${plan}',status='active',current_period_end=now()+interval '30 days' WHERE user_id='${user}';`);
    expect((await db.query<{ allowed: boolean }>(`SELECT is_premium_user('${user}') AS allowed`)).rows[0]?.allowed).toBe(true);
  }
});