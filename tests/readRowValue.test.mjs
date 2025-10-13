import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Simulating the readRowValue function for testing purposes
function readRowValue(row, candidates) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    if (candidate in row) {
      return row[candidate];
    }
    const lowerCandidate = candidate.toLowerCase();
    for (const [key, value] of entries) {
      if (key.toLowerCase() === lowerCandidate) {
        return value;
      }
    }
  }
  return undefined;
}

describe("readRowValue column name matching", () => {
  it("finds exact match column names", () => {
    const row = { checkin_time: "2023-10-15T10:00:00Z", staff_id: 123 };
    assert.equal(readRowValue(row, ["checkin_time", "checkin"]), "2023-10-15T10:00:00Z");
  });

  it("handles case-insensitive matching", () => {
    const row = { CheckIn_Time: "2023-10-15T10:00:00Z" };
    assert.equal(readRowValue(row, ["checkin_time", "checkin"]), "2023-10-15T10:00:00Z");
  });

  it("returns first matching candidate", () => {
    const row = { checkin_local: "2023-10-15T10:00:00Z", checkin_time: "2023-10-15T09:00:00Z" };
    assert.equal(
      readRowValue(row, ["checkin_local", "checkin_time", "checkin"]),
      "2023-10-15T10:00:00Z"
    );
  });

  it("returns undefined when no match found", () => {
    const row = { some_other_column: "value" };
    assert.equal(readRowValue(row, ["checkin_time", "checkin"]), undefined);
  });

  it("handles snake_case variations", () => {
    const row = { session_id: 456 };
    assert.equal(readRowValue(row, ["session_id", "attendance_id", "id"]), 456);
  });

  it("handles alternative column names", () => {
    const row = { start_time: "2023-10-15T10:00:00Z" };
    assert.equal(
      readRowValue(row, ["checkin_local", "checkin_time", "checkin", "start_time"]),
      "2023-10-15T10:00:00Z"
    );
  });

  it("returns null values correctly", () => {
    const row = { checkin_time: null };
    assert.equal(readRowValue(row, ["checkin_time"]), null);
  });
});
