import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  __resetHasValidPinSessionForTests,
  __setHasValidPinSessionForTests,
} from "../lib/security/pin-session.ts";
import { POST as approveDay } from "../app/api/(administration)/payroll/reports/approve-day/route.ts";

describe("approve day authorization", () => {
  it("returns 401 when manager PIN session is missing", async () => {
    __setHasValidPinSessionForTests(async () => false);
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: 1, workDate: "2025-01-01" }),
    });

    const response = await approveDay(request);
    __resetHasValidPinSessionForTests();

    assert.equal(response.status, 401);
  });
});
