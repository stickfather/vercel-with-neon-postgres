import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normalizePayrollTimestamp,
  PAYROLL_TIMEZONE_OFFSET,
} from "../lib/payroll/timezone.ts";

describe("normalizePayrollTimestamp", () => {
  it("preserves fractional seconds from database strings", () => {
    const raw = "2025-11-10 09:54:12.123456-05";
    assert.equal(
      normalizePayrollTimestamp(raw),
      "2025-11-10T09:54:12.123456-05:00",
    );
  });

  it("keeps timezone offsets with or without separators", () => {
    const compact = "2025-11-10T09:54:12-0500";
    assert.equal(
      normalizePayrollTimestamp(compact),
      "2025-11-10T09:54:12-05:00",
    );
  });

  it("normalizes verbose browser-style timestamps", () => {
    const verbose = "Sun Oct 12 2025 11:43:00 GMT+0000 (Coordinated Universal Time)";
    assert.equal(
      normalizePayrollTimestamp(verbose),
      "2025-10-12T11:43:00+00:00",
    );
  });
});

describe("PAYROLL_TIMEZONE_OFFSET", () => {
  it("matches the expected Guayaquil offset", () => {
    assert.equal(PAYROLL_TIMEZONE_OFFSET, "-05:00");
  });
});
