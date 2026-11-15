import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
beforeAll(async () => {
  await db.exec(`CREATE ROLE service_role; CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text,email text);
    CREATE TABLE pix_payment_requests(id uuid PRIMARY KEY,user_email text,amount_brl numeric,status text);`);
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0004_admin_activity_notifications.sql", import.meta.url), "utf8"));
});
afterAll(() => db.close());

it("cada novo cadastro gera um aviso durável", async () => {
  await db.exec(`INSERT INTO profiles VALUES ('00000000-0000-0000-0000-000000000001','Teste','test@example.invalid'),('00000000-0000-0000-0000-000000000002','Outro','other@example.invalid');`);
  const { rows } = await db.query<{ count: number; unread: number }>(`SELECT count(*)::int AS count,count(*) FILTER(WHERE read_at IS NULL)::int AS unread FROM admin_activity_notifications WHERE event_type='signup'`);
  expect(rows[0]?.count).toBe(2);
  expect(rows[0]?.unread).toBe(2);
  await db.exec(`UPDATE profiles SET full_name='Alterado';`);
  expect((await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM admin_activity_notifications WHERE event_type='signup'`)).rows[0]?.count).toBe(2);
});

it("cada novo Pix informado gera um aviso, sem duplicar na aprovação", async () => {
  await db.exec(`INSERT INTO pix_payment_requests VALUES ('00000000-0000-0000-0000-000000000003','test@example.invalid',10,'aguardando_aprovacao'); UPDATE pix_payment_requests SET status='aprovado';`);
  expect((await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM admin_activity_notifications WHERE event_type='pix_reported'`)).rows[0]?.count).toBe(1);
});

it("usuários comuns não podem consultar avisos privados", async () => {
  await db.exec(`SET ROLE authenticated;`);
  await expect(db.query(`SELECT * FROM admin_activity_notifications`)).rejects.toThrow(/permission denied/);
  await db.exec(`RESET ROLE;`);
});