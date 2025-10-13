import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  _hashPinForTests,
  _verifyHashForTests,
} from "../features/security/data/pins.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeSuite = hasDatabase ? describe : describe.skip;

describeSuite("PIN hashing", () => {
  it("validates a correct PIN", async () => {
    const hash = await _hashPinForTests("1234");
    const ok = await _verifyHashForTests("1234", hash);
    assert.equal(ok, true);
  });

  it("rejects an incorrect PIN", async () => {
    const hash = await _hashPinForTests("5678");
    const ok = await _verifyHashForTests("1234", hash);
    assert.equal(ok, false);
  });
});
