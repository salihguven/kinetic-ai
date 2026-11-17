import test from "node:test";
import assert from "node:assert/strict";
import { readLimitedBody } from "../src/lib/readLimitedBody.js";

test("bounded request reader accepts valid UTF-8 at the limit", async () => {
  const request = new Request("https://kinetic.example/api", { method: "POST", body: "12345" });
  assert.deepEqual(await readLimitedBody(request, 5), { ok: true, text: "12345" });
});

test("bounded request reader rejects oversize bodies and malformed UTF-8", async () => {
  const largeRequest = new Request("https://kinetic.example/api", { method: "POST", body: "123456" });
  assert.equal((await readLimitedBody(largeRequest, 5)).ok, false);
  const invalidUtf8 = new Request("https://kinetic.example/api", {
    method: "POST",
    body: new Uint8Array([0xc3, 0x28]),
  });
  assert.equal((await readLimitedBody(invalidUtf8, 5)).ok, false);
});
