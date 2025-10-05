import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeDateLike } from "../features/administration/data/payroll-reports.ts";

describe("normalizeDateLike", () => {
  it("returns ISO date when passed an ISO string", () => {
    assert.equal(normalizeDateLike("2023-10-15"), "2023-10-15");
  });

  it("extracts the date portion of ISO timestamps", () => {
    assert.equal(normalizeDateLike("2023-10-15T12:34:56Z"), "2023-10-15");
  });

  it("handles day-first dates with slashes", () => {
    assert.equal(normalizeDateLike("15/10/2023"), "2023-10-15");
  });

  it("handles day-first dates with dashes and time", () => {
    assert.equal(normalizeDateLike("15-10-2023 14:30"), "2023-10-15");
  });

  it("handles day-first dates with dots", () => {
    assert.equal(normalizeDateLike("15.10.2023"), "2023-10-15");
  });

  it("returns null for unrecognized strings", () => {
    assert.equal(normalizeDateLike("not-a-date"), null);
  });
});
