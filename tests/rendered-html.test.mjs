import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders MedQuote without starter metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MedQuote<\/title>/i);
  assert.match(html, /MedQuote/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
});

test("keeps Supabase demo fallback and product flows in source", async () => {
  const [app, packageJson, envExample] = await Promise.all([
    readFile(new URL("../components/medquote-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(app, /Mode Demo/);
  assert.match(app, /Tambah Penawaran/);
  assert.match(app, /Etalase Produk/);
  assert.match(packageJson, /"@supabase\/supabase-js"/);
  assert.match(packageJson, /"jspdf"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(envExample, /VITE_SUPABASE_URL/);
  assert.match(envExample, /VITE_SUPABASE_ANON_KEY/);
});
