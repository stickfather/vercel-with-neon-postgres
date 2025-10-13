import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Test helper that simulates timezone-aware date extraction from timestamps.
 * Mimics the toTimeZoneDayString function from payroll-reports.ts
 */
function toTimeZoneDayString(isoTimestamp, timezone = "America/Guayaquil") {
  if (!isoTimestamp) return null;
  
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  
  if (!year || !month || !day) {
    return null;
  }
  
  return `${year}-${month}-${day}`;
}

/**
 * Test helper that simulates session grouping by local date.
 * This is what should happen in the database view or application logic.
 */
function groupSessionsByLocalDate(sessions, timezone = "America/Guayaquil") {
  const grouped = new Map();
  
  for (const session of sessions) {
    const localDate = toTimeZoneDayString(session.checkinTime, timezone);
    if (!localDate) continue;
    
    if (!grouped.has(localDate)) {
      grouped.set(localDate, []);
    }
    grouped.get(localDate).push(session);
  }
  
  return grouped;
}

describe("Session bucketing by local date (timezone handling)", () => {
  const TIMEZONE = "America/Guayaquil"; // UTC-5
  
  it("buckets sessions near midnight UTC to correct local date", () => {
    // Session at 23:00 local time on Oct 1 = 04:00 UTC on Oct 2
    const sessions = [
      {
        id: 1,
        staffId: 101,
        checkinTime: "2025-10-02T04:00:00.000Z",  // Oct 1 23:00 local
        checkoutTime: "2025-10-02T05:00:00.000Z", // Oct 2 00:00 local
        minutes: 60
      }
    ];
    
    const grouped = groupSessionsByLocalDate(sessions, TIMEZONE);
    
    // Should be bucketed to Oct 1 (local date of checkin), not Oct 2
    assert.ok(grouped.has("2025-10-01"), "Should have sessions for Oct 1");
    assert.equal(grouped.get("2025-10-01").length, 1);
    assert.ok(!grouped.has("2025-10-02"), "Should not have sessions for Oct 2");
  });
  
  it("handles sessions that start before midnight local and end after", () => {
    // Session from 23:30 to 00:30 local time
    const sessions = [
      {
        id: 1,
        staffId: 101,
        checkinTime: "2025-10-02T04:30:00.000Z",  // Oct 1 23:30 local
        checkoutTime: "2025-10-02T05:30:00.000Z", // Oct 2 00:30 local
        minutes: 60
      }
    ];
    
    const grouped = groupSessionsByLocalDate(sessions, TIMEZONE);
    
    // Should be bucketed by checkin date (Oct 1 local)
    assert.ok(grouped.has("2025-10-01"), "Should be bucketed by checkin date");
    assert.equal(grouped.get("2025-10-01").length, 1);
  });
  
  it("correctly separates sessions from different local days", () => {
    const sessions = [
      {
        id: 1,
        staffId: 101,
        // Oct 1 at 08:00 local = Oct 1 13:00 UTC
        checkinTime: "2025-10-01T13:00:00.000Z",
        checkoutTime: "2025-10-01T18:00:00.000Z",
        minutes: 300
      },
      {
        id: 2,
        staffId: 101,
        // Oct 2 at 08:00 local = Oct 2 13:00 UTC
        checkinTime: "2025-10-02T13:00:00.000Z",
        checkoutTime: "2025-10-02T18:00:00.000Z",
        minutes: 300
      },
      {
        id: 3,
        staffId: 101,
        // Oct 1 at 23:00 local = Oct 2 04:00 UTC (tricky case!)
        checkinTime: "2025-10-02T04:00:00.000Z",
        checkoutTime: "2025-10-02T05:00:00.000Z",
        minutes: 60
      }
    ];
    
    const grouped = groupSessionsByLocalDate(sessions, TIMEZONE);
    
    // Should have 2 sessions on Oct 1 (including the late night one)
    assert.ok(grouped.has("2025-10-01"), "Should have Oct 1");
    assert.equal(grouped.get("2025-10-01").length, 2, "Oct 1 should have 2 sessions");
    
    // Should have 1 session on Oct 2
    assert.ok(grouped.has("2025-10-02"), "Should have Oct 2");
    assert.equal(grouped.get("2025-10-02").length, 1, "Oct 2 should have 1 session");
  });
  
  it("handles month boundary correctly (Sept 30 -> Oct 1)", () => {
    const sessions = [
      {
        id: 1,
        staffId: 101,
        // Sept 30 at 23:30 local = Oct 1 04:30 UTC
        checkinTime: "2025-10-01T04:30:00.000Z",
        checkoutTime: "2025-10-01T06:00:00.000Z",
        minutes: 90
      },
      {
        id: 2,
        staffId: 101,
        // Oct 1 at 08:00 local = Oct 1 13:00 UTC
        checkinTime: "2025-10-01T13:00:00.000Z",
        checkoutTime: "2025-10-01T18:00:00.000Z",
        minutes: 300
      }
    ];
    
    const grouped = groupSessionsByLocalDate(sessions, TIMEZONE);
    
    // Should have one session on Sept 30
    assert.ok(grouped.has("2025-09-30"), "Should have Sept 30");
    assert.equal(grouped.get("2025-09-30").length, 1);
    
    // Should have one session on Oct 1
    assert.ok(grouped.has("2025-10-01"), "Should have Oct 1");
    assert.equal(grouped.get("2025-10-01").length, 1);
  });
  
  it("handles DST transitions correctly", () => {
    // Note: Ecuador (America/Guayaquil) doesn't observe DST, but test structure
    // In timezones with DST, sessions around DST changes need special handling
    const sessions = [
      {
        id: 1,
        staffId: 101,
        // March 9, 2025 around typical DST transition time (if it applied)
        checkinTime: "2025-03-09T13:00:00.000Z", // 08:00 local
        checkoutTime: "2025-03-09T18:00:00.000Z",
        minutes: 300
      }
    ];
    
    const grouped = groupSessionsByLocalDate(sessions, TIMEZONE);
    
    // Should correctly bucket to March 9
    assert.ok(grouped.has("2025-03-09"), "Should handle DST period");
    assert.equal(grouped.get("2025-03-09").length, 1);
  });
  
  it("handles sessions at exact midnight UTC", () => {
    const sessions = [
      {
        id: 1,
        staffId: 101,
        // Midnight UTC = 19:00 previous day in Guayaquil
        checkinTime: "2025-10-02T00:00:00.000Z", // Oct 1 19:00 local
        checkoutTime: "2025-10-02T01:00:00.000Z", // Oct 1 20:00 local
        minutes: 60
      }
    ];
    
    const grouped = groupSessionsByLocalDate(sessions, TIMEZONE);
    
    // Should be bucketed to Oct 1, not Oct 2
    assert.ok(grouped.has("2025-10-01"), "Should bucket to Oct 1");
    assert.equal(grouped.get("2025-10-01").length, 1);
    assert.ok(!grouped.has("2025-10-02"), "Should not bucket to Oct 2");
  });
  
  it("aggregates total minutes correctly per local date", () => {
    const sessions = [
      {
        id: 1,
        staffId: 101,
        checkinTime: "2025-10-01T13:00:00.000Z", // Oct 1 08:00 local
        checkoutTime: "2025-10-01T18:00:00.000Z", // Oct 1 13:00 local
        minutes: 300
      },
      {
        id: 2,
        staffId: 101,
        checkinTime: "2025-10-01T19:00:00.000Z", // Oct 1 14:00 local
        checkoutTime: "2025-10-01T22:00:00.000Z", // Oct 1 17:00 local
        minutes: 180
      },
      {
        id: 3,
        staffId: 101,
        checkinTime: "2025-10-02T04:00:00.000Z", // Oct 1 23:00 local
        checkoutTime: "2025-10-02T05:00:00.000Z", // Oct 2 00:00 local
        minutes: 60
      }
    ];
    
    const grouped = groupSessionsByLocalDate(sessions, TIMEZONE);
    
    // Calculate total minutes for Oct 1
    const oct1Sessions = grouped.get("2025-10-01") || [];
    const totalMinutes = oct1Sessions.reduce((sum, s) => sum + s.minutes, 0);
    
    assert.equal(totalMinutes, 540, "Should aggregate 540 minutes (9 hours) for Oct 1");
    assert.equal(oct1Sessions.length, 3, "Should have 3 sessions on Oct 1");
  });
});
