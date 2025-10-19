import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { toTimeZoneDayString } from "../features/administration/data/payroll-reports.ts";

describe("toTimeZoneDayString", () => {
  it("returns the ISO date prefix when timestamps are provided", () => {
    const iso = "2025-10-02T04:59:59.000Z";
    assert.equal(toTimeZoneDayString(iso), "2025-10-02");
  });

  it("preserves date-only strings", () => {
    const iso = "2025-10-02";
    assert.equal(toTimeZoneDayString(iso), "2025-10-02");
  });
});
