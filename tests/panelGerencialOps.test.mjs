import test from "node:test";
import assert from "node:assert/strict";

import {
  clampRatio,
  filterRowsByHourRange,
  normalizeRatioDisplay,
  selectHourRange,
  sortPeakWindows,
} from "../src/features/panelGerencial/tabs/Ops/transform";
import {
  formatPercentDisplay,
  isExamDataEmpty,
  normalizePercent,
} from "../src/features/panelGerencial/tabs/Exams/helpers";

test("selectHourRange toggles between default and full day", () => {
  assert.deepEqual(selectHourRange(false), { start: 8, end: 20 });
  assert.deepEqual(selectHourRange(true), { start: 0, end: 23 });
});

test("filterRowsByHourRange trims rows outside of the selected window", () => {
  const rows = [{ hour: 7 }, { hour: 9 }, { hour: 22 }];
  const range = { start: 8, end: 20 };
  const filtered = filterRowsByHourRange(rows, range);
  assert.deepEqual(filtered, [{ hour: 9 }]);
});

test("sortPeakWindows prioritises highest averages and respects limit", () => {
  const rows = [
    { dow: 1, hour: 8, avg_students: 20, p95_students: 30 },
    { dow: 2, hour: 9, avg_students: 25, p95_students: 32 },
    { dow: 3, hour: 10, avg_students: 25, p95_students: 28 },
  ];
  const sorted = sortPeakWindows(rows, { start: 0, end: 23 }, 2);
  assert.equal(sorted.length, 2);
  assert.deepEqual(sorted[0], rows[1]);
  assert.deepEqual(sorted[1], rows[2]);
});

test("normalizeRatioDisplay returns null ratio when staff is zero", () => {
  const row = {
    dow: 1,
    hour: 10,
    avg_students: 15,
    avg_staff: 0,
    avg_student_staff_ratio: 5,
    p95_students: 20,
    p95_staff: 2,
  };
  const normalized = normalizeRatioDisplay(row);
  assert.equal(normalized.ratio, null);
  assert.equal(normalized.avgStudents, 15);
  assert.equal(normalized.avgStaff, 0);
});

test("clampRatio keeps ratios within the default range", () => {
  assert.equal(clampRatio(2.5), 2.5);
  assert.equal(clampRatio(-1), 0);
  assert.equal(clampRatio(10), 6);
  assert.equal(clampRatio(null), null);
});

test("normalizePercent converts whole numbers to proportions", () => {
  assert.equal(normalizePercent(75), 0.75);
  assert.equal(normalizePercent(0.42), 0.42);
  assert.equal(normalizePercent(null), null);
});

test("formatPercentDisplay renders locale aware percents", () => {
  const formatted = formatPercentDisplay(50);
  assert.ok(formatted.endsWith("%"));
  assert.ok(formatted.startsWith("50"));
});

test("isExamDataEmpty is true only when there is no trend nor latest data", () => {
  assert.equal(isExamDataEmpty(true, 0, false), true);
  assert.equal(isExamDataEmpty(true, 1, false), false);
  assert.equal(isExamDataEmpty(true, 0, true), false);
  assert.equal(isExamDataEmpty(false, 0, false), false);
});
