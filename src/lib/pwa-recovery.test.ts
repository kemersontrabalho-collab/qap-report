import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";

it("recuperação limpa só caches do app, recarrega e remove o registro antigo", async () => {
  const listeners: Record<string, (event?: unknown) => void> = {};
  const deleted: string[] = [];
  const navigated: string[] = [];
  let unregistered = false;
  let task: Promise<unknown> | undefined;
  runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), {
    self: { registration: { scope: "https://example.invalid/", unregister: async () => { unregistered = true; } }, skipWaiting: () => {}, addEventListener: (name: string, fn: (event?: unknown) => void) => { listeners[name] = fn; }, clients: { claim: async () => {}, matchAll: async () => [{ url: "https://example.invalid/dashboard", navigate: async (url: string) => { navigated.push(url); } }] } },
    caches: { keys: async () => ["workbox-precache-v2-https://example.invalid/", "html-navigations", "assets", "google-fonts", "firebase-messaging", "drafts"], delete: async (name: string) => { deleted.push(name); } },
  });
  listeners["activate"]?.({ waitUntil: (value: Promise<unknown>) => { task = value; } });
  if (!task) throw new Error("Recuperação não iniciou");
  await task;
  expect(deleted).toEqual(["workbox-precache-v2-https://example.invalid/", "html-navigations", "assets", "google-fonts"]);
  expect(navigated).toEqual(["https://example.invalid/dashboard"]);
  expect(unregistered).toBe(true);
});