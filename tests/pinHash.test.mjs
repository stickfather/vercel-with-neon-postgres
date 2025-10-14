import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  __resetPinsForTests,
  getSecurityPinStatuses,
  getSecurityPinsSummary,
  updateSecurityPins,
  verifySecurityPin,
} from "../features/security/data/pins.ts";

describe("in-memory PIN store", () => {
  beforeEach(() => {
    __resetPinsForTests();
  });

  it("accepts the default PIN for both scopes", async () => {
    const managerOk = await verifySecurityPin("manager", "1234");
    const staffOk = await verifySecurityPin("staff", "1234");

    assert.equal(managerOk, true);
    assert.equal(staffOk, true);
  });

  it("updates the manager PIN", async () => {
    await updateSecurityPins({ managerPin: "9876" });

    const oldOk = await verifySecurityPin("manager", "1234");
    const newOk = await verifySecurityPin("manager", "9876");

    assert.equal(oldOk, false);
    assert.equal(newOk, true);
  });

  it("returns status metadata for each scope", async () => {
    await updateSecurityPins({ managerPin: "9876" });

    const statuses = await getSecurityPinStatuses();
    const managerStatus = statuses.find((status) => status.scope === "manager");
    const staffStatus = statuses.find((status) => status.scope === "staff");

    assert.equal(managerStatus?.isSet, true);
    assert.equal(typeof managerStatus?.updatedAt, "string");
    assert.equal(staffStatus?.isSet, true);
    assert.equal(staffStatus?.updatedAt, null);
  });

  it("surfaces summary information", async () => {
    await updateSecurityPins({ staffPin: "5555" });

    const summary = await getSecurityPinsSummary();

    assert.equal(summary.hasManager, true);
    assert.equal(summary.hasStaff, true);
    assert.equal(typeof summary.updatedAt, "string");
  });

  it("rejects invalid PIN formats", async () => {
    await assert.rejects(() => updateSecurityPins({ managerPin: "abcd" }));
    await assert.rejects(() => updateSecurityPins({ managerPin: "12" }));
  });
});
