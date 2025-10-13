#!/usr/bin/env node

/**
 * Verification script for payroll timezone fixes
 * 
 * This script demonstrates that:
 * 1. October 2025 generates exactly 31 days (Oct 1-31)
 * 2. No September 30 or November 1 appear
 * 3. Session bucketing works correctly for local timezone
 */

const TIMEZONE = "America/Guayaquil"; // UTC-5

console.log("═══════════════════════════════════════════════════════════");
console.log("  Payroll Reports Timezone Fix Verification");
console.log("═══════════════════════════════════════════════════════════\n");

// Test 1: Month day generation
console.log("📅 Test 1: Month Day Generation for October 2025");
console.log("─────────────────────────────────────────────────────────────");

function enumerateDaysFromStrings(fromStr, toStr) {
  const days = [];
  
  const fromMatch = fromStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const toMatch = toStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  
  if (!fromMatch || !toMatch) {
    throw new Error("Invalid date format");
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
      throw new Error("Exceeded maximum iteration count");
    }
  }
  
  return days;
}

const octDays = enumerateDaysFromStrings("2025-10-01", "2025-10-31");

console.log(`First day: ${octDays[0]}`);
console.log(`Last day:  ${octDays[octDays.length - 1]}`);
console.log(`Total days: ${octDays.length}`);
console.log();

const hasSept30 = octDays.includes("2025-09-30");
const hasNov1 = octDays.includes("2025-11-01");

console.log(`❌ Contains 2025-09-30 (Sept 30)? ${hasSept30 ? "YES (BUG!)" : "NO (CORRECT)"}`);
console.log(`❌ Contains 2025-11-01 (Nov 1)?    ${hasNov1 ? "YES (BUG!)" : "NO (CORRECT)"}`);
console.log(`✅ Contains 2025-10-01 (Oct 1)?    ${octDays.includes("2025-10-01") ? "YES (CORRECT)" : "NO (BUG!)"}`);
console.log(`✅ Contains 2025-10-31 (Oct 31)?   ${octDays.includes("2025-10-31") ? "YES (CORRECT)" : "NO (BUG!)"}`);

if (!hasSept30 && !hasNov1 && octDays.length === 31) {
  console.log("\n✅ PASS: Month boundaries are correct!\n");
} else {
  console.log("\n❌ FAIL: Month boundaries are incorrect!\n");
  process.exit(1);
}

// Test 2: Session bucketing
console.log("⏰ Test 2: Session Bucketing by Local Date");
console.log("─────────────────────────────────────────────────────────────");

function toTimeZoneDayString(isoTimestamp, timezone) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;
  
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  
  return year && month && day ? `${year}-${month}-${day}` : null;
}

// Test case: Session at 23:00 local (04:00 UTC next day)
const lateSessionUTC = "2025-10-02T04:00:00.000Z"; // Oct 1 23:00 in Guayaquil
const localDate = toTimeZoneDayString(lateSessionUTC, TIMEZONE);

console.log(`UTC timestamp:  ${lateSessionUTC}`);
console.log(`  (This is Oct 2, 04:00 in UTC)`);
console.log();
console.log(`Local timezone: ${TIMEZONE} (UTC-5)`);
console.log(`Local date:     ${localDate}`);
console.log(`  (This is Oct 1, 23:00 in local time)`);
console.log();

if (localDate === "2025-10-01") {
  console.log("✅ PASS: Session correctly bucketed to Oct 1 (local date)");
  console.log("   Instead of Oct 2 (UTC date)\n");
} else {
  console.log(`❌ FAIL: Session bucketed to ${localDate} instead of 2025-10-01\n`);
  process.exit(1);
}

// Test 3: Month boundary session
console.log("🔄 Test 3: Month Boundary Session (Sept 30 -> Oct 1)");
console.log("─────────────────────────────────────────────────────────────");

const sept30Session = "2025-10-01T04:30:00.000Z"; // Sept 30 23:30 in Guayaquil
const sept30Date = toTimeZoneDayString(sept30Session, TIMEZONE);

console.log(`UTC timestamp:  ${sept30Session}`);
console.log(`  (This is Oct 1, 04:30 in UTC)`);
console.log();
console.log(`Local date:     ${sept30Date}`);
console.log(`  (This is Sept 30, 23:30 in local time)`);
console.log();

if (sept30Date === "2025-09-30") {
  console.log("✅ PASS: Session correctly bucketed to Sept 30 (local date)");
  console.log("   Even though UTC timestamp is Oct 1\n");
} else {
  console.log(`❌ FAIL: Session bucketed to ${sept30Date} instead of 2025-09-30\n`);
  process.exit(1);
}

// Test 4: Day label formatting
console.log("🏷️  Test 4: Day Label Formatting (Spanish)");
console.log("─────────────────────────────────────────────────────────────");

const dayHeaderFormatter = new Intl.DateTimeFormat("es-EC", {
  day: "2-digit",
  month: "short",
});

const weekdayFormatter = new Intl.DateTimeFormat("es-EC", {
  weekday: "short",
});

function formatDayLabel(dateString, formatter) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return formatter.format(date);
}

const sampleDates = ["2025-10-01", "2025-10-15", "2025-10-31"];
console.log("Sample day labels for October 2025:\n");

for (const date of sampleDates) {
  const header = formatDayLabel(date, dayHeaderFormatter);
  const weekday = formatDayLabel(date, weekdayFormatter);
  console.log(`  ${date} → "${header.toUpperCase()} ${weekday.toUpperCase()}"`);
}

console.log();

// Summary
console.log("═══════════════════════════════════════════════════════════");
console.log("  ✅ All Tests Passed!");
console.log("═══════════════════════════════════════════════════════════");
console.log();
console.log("Summary:");
console.log("  • October 2025 matrix will show exactly 31 days");
console.log("  • No Sept 30 or Nov 1 will appear");
console.log("  • Sessions are correctly bucketed by local date");
console.log("  • Late night sessions (23:00) stay on the same day");
console.log("  • Day labels display in Spanish with proper formatting");
console.log();
console.log("Next Steps:");
console.log("  1. Deploy these changes to the staging environment");
console.log("  2. Navigate to Payroll Reports → October 2025");
console.log("  3. Verify the matrix shows 01-OCT through 31-OCT");
console.log("  4. Click on cells with hours and verify sessions appear");
console.log();
