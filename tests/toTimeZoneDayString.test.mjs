import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { toTimeZoneDayString } from "../features/administration/data/payroll-reports.ts";

describe("toTimeZoneDayString", () => {
  it("maps late-night UTC timestamps to the previous Guayaquil day", () => {
    const iso = "2025-10-02T04:59:59.000Z"; // 23:59:59 local time (UTC-5)
    assert.equal(toTimeZoneDayString(iso), "2025-10-01");
  });

  it("keeps early-morning local timestamps on the same day", () => {
    const iso = "2025-10-02T05:00:00.000Z"; // 00:00:00 local time
    assert.equal(toTimeZoneDayString(iso), "2025-10-02");
  });
});
