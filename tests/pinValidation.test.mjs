import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { __sanitizePinForTests } from "../features/security/data/pins.ts";

describe("PIN validation", () => {
  it("accepts numeric PINs between 4 and 6 digits", () => {
    assert.equal(__sanitizePinForTests("1234"), "1234");
    assert.equal(__sanitizePinForTests(" 098765 "), "098765");
  });

  it("rejects PINs shorter than 4 digits", () => {
    assert.throws(() => __sanitizePinForTests("123"));
  });

  it("rejects PINs longer than 6 digits", () => {
    assert.throws(() => __sanitizePinForTests("1234567"));
  });

  it("rejects non-numeric input", () => {
    assert.throws(() => __sanitizePinForTests("12ab"));
  });
});
