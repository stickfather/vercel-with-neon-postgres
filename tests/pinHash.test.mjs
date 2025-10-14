import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  _hashPinForTests,
  _verifyHashForTests,
  verifySecurityPin,
} from "../features/security/data/pins.ts";
import { getSqlClient, normalizeRows } from "../lib/db/client.ts";

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

  it("accepts legacy plain-text values and upgrades them", async () => {
    await verifySecurityPin("manager", "9999").catch(() => {});

    const sql = getSqlClient();
    await sql`
      UPDATE security_pins
      SET manager_pin_hash = ${"1234"}, staff_pin_hash = NULL, updated_at = now()
      WHERE id = 1
    `;

    const ok = await verifySecurityPin("manager", "1234");
    assert.equal(ok, true);

    const rows = normalizeRows(await sql`
      SELECT manager_pin_hash
      FROM security_pins
      WHERE id = 1
    `);
    const stored = rows[0]?.manager_pin_hash;
    assert.equal(typeof stored, "string");
    assert.equal(String(stored).startsWith("$2"), true);
  });

  it("seeds default PINs when none are stored", async () => {
    const sql = getSqlClient();

    await sql`
      UPDATE security_pins
      SET manager_pin_hash = NULL, staff_pin_hash = NULL, updated_at = now(), force_default = false
      WHERE id = 1
    `;

    const managerOk = await verifySecurityPin("manager", "1234");
    const staffOk = await verifySecurityPin("staff", "1234");

    assert.equal(managerOk, true);
    assert.equal(staffOk, true);

    const rows = normalizeRows(await sql`
      SELECT manager_pin_hash, staff_pin_hash
      FROM security_pins
      WHERE id = 1
    `);

    const managerHash = rows[0]?.manager_pin_hash;
    const staffHash = rows[0]?.staff_pin_hash;

    assert.equal(typeof managerHash, "string");
    assert.equal(typeof staffHash, "string");
    assert.equal(String(managerHash).startsWith("$2"), true);
    assert.equal(String(staffHash).startsWith("$2"), true);
  });

  it("forces default PINs when requested", async () => {
    const sql = getSqlClient();

    const customHash = await _hashPinForTests("5678");

    await sql`
      UPDATE security_pins
      SET
        manager_pin_hash = ${customHash},
        staff_pin_hash = ${customHash},
        force_default = true,
        updated_at = now()
      WHERE id = 1
    `;

    const ok = await verifySecurityPin("manager", "1234");
    assert.equal(ok, true);

    const rows = normalizeRows(await sql`
      SELECT manager_pin_hash, staff_pin_hash, force_default
      FROM security_pins
      WHERE id = 1
    `);

    const managerHash = rows[0]?.manager_pin_hash;
    const staffHash = rows[0]?.staff_pin_hash;
    const forceDefault = rows[0]?.force_default;

    assert.equal(typeof managerHash, "string");
    assert.equal(typeof staffHash, "string");
    assert.equal(String(managerHash).startsWith("$2"), true);
    assert.equal(String(staffHash).startsWith("$2"), true);
    assert.equal(forceDefault, false);
  });
});
