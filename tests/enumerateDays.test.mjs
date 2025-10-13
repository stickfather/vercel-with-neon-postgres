import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Test helper function that mimics enumerateDaysFromStrings from payroll-reports.ts
 */
function enumerateDaysFromStrings(fromStr, toStr) {
  const days = [];
  
  const fromMatch = fromStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const toMatch = toStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  
  if (!fromMatch || !toMatch) {
    throw new Error("Invalid date format for enumerateDays");
  }
  
  let year = Number(fromMatch[1]);
  let month = Number(fromMatch[2]);
  let day = Number(fromMatch[3]);
  
  const toYear = Number(toMatch[1]);
  const toMonth = Number(toMatch[2]);
  const toDay = Number(toMatch[3]);
  
  while (true) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push(dateStr);
    
    if (year === toYear && month === toMonth && day === toDay) {
      break;
    }
    
    day++;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    if (day > daysInMonth) {
      day = 1;
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    
    if (days.length > 366) {
      throw new Error("enumerateDays exceeded maximum iteration count");
    }
  }
  
  return days;
}

describe("enumerateDaysFromStrings (month boundary handling)", () => {
  it("generates exactly 31 days for October 2025", () => {
    const days = enumerateDaysFromStrings("2025-10-01", "2025-10-31");
    assert.equal(days.length, 31);
    assert.equal(days[0], "2025-10-01");
    assert.equal(days[30], "2025-10-31");
  });

  it("does not include September 30 when enumerating October 2025", () => {
    const days = enumerateDaysFromStrings("2025-10-01", "2025-10-31");
    assert.ok(!days.includes("2025-09-30"), "Should not contain Sept 30");
  });

  it("does not include November 1 when enumerating October 2025", () => {
    const days = enumerateDaysFromStrings("2025-10-01", "2025-10-31");
    assert.ok(!days.includes("2025-11-01"), "Should not contain Nov 1");
  });

  it("handles February 2024 (leap year) correctly", () => {
    const days = enumerateDaysFromStrings("2024-02-01", "2024-02-29");
    assert.equal(days.length, 29);
    assert.equal(days[days.length - 1], "2024-02-29");
  });

  it("handles February 2025 (non-leap year) correctly", () => {
    const days = enumerateDaysFromStrings("2025-02-01", "2025-02-28");
    assert.equal(days.length, 28);
    assert.equal(days[days.length - 1], "2025-02-28");
  });

  it("handles month transitions correctly", () => {
    const days = enumerateDaysFromStrings("2024-12-30", "2025-01-02");
    assert.deepEqual(days, [
      "2024-12-30",
      "2024-12-31",
      "2025-01-01",
      "2025-01-02"
    ]);
  });

  it("handles single day range", () => {
    const days = enumerateDaysFromStrings("2025-10-15", "2025-10-15");
    assert.deepEqual(days, ["2025-10-15"]);
  });

  it("generates 31 days for months with 31 days", () => {
    const months = [
      { month: "01", name: "January" },
      { month: "03", name: "March" },
      { month: "05", name: "May" },
      { month: "07", name: "July" },
      { month: "08", name: "August" },
      { month: "10", name: "October" },
      { month: "12", name: "December" }
    ];

    for (const { month, name } of months) {
      const days = enumerateDaysFromStrings(`2025-${month}-01`, `2025-${month}-31`);
      assert.equal(days.length, 31, `${name} should have 31 days`);
    }
  });

  it("generates 30 days for months with 30 days", () => {
    const months = [
      { month: "04", name: "April" },
      { month: "06", name: "June" },
      { month: "09", name: "September" },
      { month: "11", name: "November" }
    ];

    for (const { month, name } of months) {
      const days = enumerateDaysFromStrings(`2025-${month}-01`, `2025-${month}-30`);
      assert.equal(days.length, 30, `${name} should have 30 days`);
    }
  });

  it("handles DST transition periods correctly", () => {
    // March 2025 (when DST typically occurs in many timezones)
    const marchDays = enumerateDaysFromStrings("2025-03-01", "2025-03-31");
    assert.equal(marchDays.length, 31);
    assert.equal(marchDays[0], "2025-03-01");
    assert.equal(marchDays[30], "2025-03-31");

    // November 2025 (when DST typically ends)
    const novDays = enumerateDaysFromStrings("2025-11-01", "2025-11-30");
    assert.equal(novDays.length, 30);
    assert.equal(novDays[0], "2025-11-01");
    assert.equal(novDays[29], "2025-11-30");
  });
});
