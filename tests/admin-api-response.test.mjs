import test from "node:test";
import assert from "node:assert/strict";
import { readApiJson } from "../src/lib/apiResponse.js";

test("admin UI reports empty successful responses with route context", async () => {
  await assert.rejects(
    readApiJson(new Response("", { status: 200 }), "Kullanıcı listesi"),
    /Kullanıcı listesi: sunucu boş yanıt verdi \(HTTP 200\)/
  );
});

test("admin UI gives a useful error for non-JSON server responses", async () => {
  await assert.rejects(
    readApiJson(new Response("<html>error</html>", { status: 200 }), "Admin erişim kontrolü"),
    /sunucu geçersiz JSON yanıtı verdi/
  );
});

test("API error bodies remain readable without an unhandled JSON parse exception", async () => {
  const result = await readApiJson(new Response("", { status: 503 }), "Kullanıcı listesi");
  assert.match(result.error, /HTTP 503/);
});
