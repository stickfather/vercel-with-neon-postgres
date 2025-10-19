import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  MatrixQuerySchema,
  DaySessionsQuerySchema,
  OverrideAndApproveSchema,
  ApproveDaySchema,
  MonthSummaryQuerySchema,
  SetMonthPaidSchema,
  roundMinutesToHours,
  approveDay,
  overrideAndApprove,
  getMonthSummary,
  getPayrollMatrix,
  HttpError,
} from "../lib/payroll/reports-service.ts";
import { ZodError } from "../lib/validation/zod.ts";

function createMockSqlClient(responders = []) {
  const operations = [];
  const sql = async (strings, ...values) => {
    const text = strings.reduce(
      (acc, part, index) => acc + part + (index < values.length ? `$${index + 1}` : ""),
      "",
    );
    operations.push({ type: "query", text, values });
    const responder = responders.find((entry) =>
      typeof entry.match === "function" ? entry.match(text) : entry.match.test(text),
    );
    if (responder) {
      return responder.rows;
    }
    return [];
  };
  sql.begin = async (callback) => {
    operations.push({ type: "begin" });
    const result = await callback(sql);
    operations.push({ type: "commit" });
    return result;
  };
  return { sql, operations };
}

describe("payroll reports schemas", () => {
  it("accepts month parameter for matrix", () => {
    const parsed = MatrixQuerySchema.parse({ month: "2025-10-01" });
    assert.equal(parsed.month, "2025-10-01");
  });

  it("rejects matrix requests without range", () => {
    assert.throws(() => MatrixQuerySchema.parse({}), ZodError);
  });

  it("validates day sessions query", () => {
    const parsed = DaySessionsQuerySchema.parse({ staffId: 5, date: "2025-10-05" });
    assert.equal(parsed.staffId, 5);
    assert.equal(parsed.date, "2025-10-05");
  });

  it("applies defaults in override schema", () => {
    const parsed = OverrideAndApproveSchema.parse({ staffId: 3, workDate: "2025-10-05" });
    assert.deepEqual(parsed.deletions, []);
    assert.deepEqual(parsed.additions, []);
    assert.deepEqual(parsed.overrides, []);
    assert.equal(parsed.approvedBy, undefined);
  });

  it("parses approve day schema", () => {
    const parsed = ApproveDaySchema.parse({ staffId: 7, workDate: "2025-10-06", approvedBy: " Ana " });
    assert.equal(parsed.approvedBy, "Ana");
  });

  it("validates month summary schema", () => {
    const parsed = MonthSummaryQuerySchema.parse({ month: "2025-10-01" });
    assert.equal(parsed.month, "2025-10-01");
  });

  it("normalizes optional fields in set month paid schema", () => {
    const parsed = SetMonthPaidSchema.parse({
      staffId: 1,
      month: "2025-10-01",
      paid: true,
      paidAt: "",
      amountPaid: 58.75,
      reference: "  ",
      paidBy: "Laura",
    });
    assert.equal(parsed.paidAt, undefined);
    assert.equal(parsed.reference, undefined);
    assert.equal(parsed.paidBy, "Laura");
  });

  it("accepts null paidAt values when clearing the payment date", () => {
    const parsed = SetMonthPaidSchema.parse({
      staffId: 2,
      month: "2025-11-01",
      paid: false,
      paidAt: null,
    });
    assert.equal(parsed.paidAt, undefined);
  });
});

describe("roundMinutesToHours", () => {
  it("rounds to two decimals", () => {
    assert.equal(roundMinutesToHours(135), 2.25);
    assert.equal(roundMinutesToHours(82), 1.37);
  });
});

describe("payroll integration", () => {
  it("approves a day with computed minutes", async () => {
    const { sql, operations } = createMockSqlClient([
      { match: /FROM public\.staff_members/, rows: [{ exists: true }] },
      { match: /attendance_local_base_v/, rows: [{ total_minutes: 135 }] },
    ]);

    await approveDay({ staffId: 10, workDate: "2025-10-05", approvedBy: "Laura" }, sql);

    const upsert = operations.find(
      (op) => op.type === "query" && /payroll_day_approvals/.test(op.text),
    );
    assert(upsert);
    assert.equal(upsert.values[0], 10);
    assert.equal(upsert.values[1], "2025-10-05");
    assert.equal(upsert.values[2], 135);
    assert.equal(upsert.values[3], "Laura");

    const audit = operations.filter(
      (op) => op.type === "query" && /payroll_audit_events/.test(op.text),
    );
    assert.equal(audit.length, 1);
  });

  it("overrides sessions inside a single transaction", async () => {
    const { sql, operations } = createMockSqlClient([
      { match: /FROM public\.staff_members/, rows: [{ exists: true }] },
      { match: /RETURNING id/, rows: [{ id: 501 }] },
      { match: /attendance_local_base_v/, rows: [{ total_minutes: 240 }] },
    ]);

    await overrideAndApprove(
      {
        staffId: 9,
        workDate: "2025-10-07",
        deletions: [101],
        overrides: [
          {
            sessionId: 102,
            checkinTime: "2025-10-07T08:00:00-05:00",
            checkoutTime: "2025-10-07T12:00:00-05:00",
          },
        ],
        additions: [
          {
            checkinTime: "2025-10-07T13:00:00-05:00",
            checkoutTime: "2025-10-07T15:30:00-05:00",
          },
        ],
        approvedBy: "Laura",
      },
      sql,
    );

    const beginIndex = operations.findIndex((op) => op.type === "begin");
    const commitIndex = operations.findIndex((op) => op.type === "commit");
    assert.notEqual(beginIndex, -1);
    assert.notEqual(commitIndex, -1);
    assert(beginIndex < commitIndex);

    const deleteOp = operations.find(
      (op, index) =>
        op.type === "query" &&
        /DELETE FROM public\.staff_attendance/.test(op.text) &&
        index > beginIndex &&
        index < commitIndex,
    );
    assert(deleteOp);

    const updateOp = operations.find(
      (op, index) =>
        op.type === "query" &&
        /UPDATE public\.staff_attendance/.test(op.text) &&
        index > beginIndex &&
        index < commitIndex,
    );
    assert(updateOp);

    const insertOp = operations.find(
      (op, index) =>
        op.type === "query" &&
        /INSERT INTO public\.staff_attendance/.test(op.text) &&
        /RETURNING/.test(op.text) &&
        index > beginIndex &&
        index < commitIndex,
    );
    assert(insertOp);

    const approvalOp = operations.find(
      (op, index) =>
        op.type === "query" &&
        /payroll_day_approvals/.test(op.text) &&
        index > beginIndex &&
        index < commitIndex,
    );
    assert(approvalOp);
    assert.equal(approvalOp.values[2], 240);
  });

  it("computes month summary amounts", async () => {
    const { sql } = createMockSqlClient([
      {
        match: /payroll_month_summary_v/,
        rows: [
          {
            staff_id: 4,
            staff_name: "Ana",
            month: "2025-10-01",
            approved_hours_month: 11.75,
            hourly_wage: 5,
            approved_amount: null,
            paid: false,
            paid_at: null,
            amount_paid: null,
            reference: null,
            paid_by: null,
          },
        ],
      },
    ]);

    const rows = await getMonthSummary({ month: "2025-10-01" }, sql);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].month, "2025-10-01");
    assert.equal(rows[0].approvedHours, 11.75);
    assert.equal(rows[0].hourlyWage, 5);
    assert.equal(rows[0].approvedAmount, 58.75);
  });

  it("uses approved amount from the month summary view when provided", async () => {
    const { sql } = createMockSqlClient([
      {
        match: /payroll_month_summary_v/,
        rows: [
          {
            staff_id: 7,
            staff_name: "Beatriz",
            month: "2025-10-01",
            approved_hours_month: 9.5,
            hourly_wage: 4.75,
            approved_amount: 73.43,
            paid: true,
            paid_at: "2025-11-02T10:15:00Z",
            amount_paid: 73.43,
            reference: "dep-123",
            paid_by: "Ana",
          },
        ],
      },
    ]);

    const rows = await getMonthSummary({ month: "2025-10-01" }, sql);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].month, "2025-10-01");
    assert.equal(rows[0].approvedHours, 9.5);
    assert.equal(rows[0].hourlyWage, 4.75);
    assert.equal(rows[0].approvedAmount, 73.43);
    assert.equal(rows[0].amountPaid, 73.43);
    assert.equal(rows[0].paidAt, "2025-11-02T10:15:00Z");
  });

  it("normalizes month values with timestamps", async () => {
    const { sql } = createMockSqlClient([
      {
        match: /payroll_month_summary_v/,
        rows: [
          {
            staff_id: 8,
            staff_name: "Carlos",
            month: new Date("2025-10-01T00:00:00.000Z"),
            approved_hours_month: 5,
            hourly_wage: 3.5,
            approved_amount: 17.5,
            paid: false,
            paid_at: null,
            amount_paid: null,
            reference: null,
            paid_by: null,
          },
        ],
      },
    ]);

    const rows = await getMonthSummary({ month: "2025-10-01" }, sql);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].month, "2025-10-01");
  });

  it("smoke test: deterministic matrix totals", async () => {
    const { sql } = createMockSqlClient([
      {
        match: /staff_day_matrix_local_v/,
        rows: [
          {
            staff_id: 1,
            staff_name: "Ana",
            work_date: "2025-10-01",
            total_hours: 1.5,
            approved_hours: null,
            horas_mostrar: 1.5,
            approved: false,
            has_edits: false,
          },
          {
            staff_id: 1,
            staff_name: "Ana",
            work_date: "2025-10-02",
            total_hours: 2.5,
            approved_hours: 2.25,
            horas_mostrar: 2.4,
            approved: true,
            has_edits: false,
          },
          {
            staff_id: 2,
            staff_name: "Ben",
            work_date: "2025-10-02",
            total_hours: 3,
            approved_hours: null,
            horas_mostrar: 3,
            approved: false,
            has_edits: false,
          },
        ],
      },
    ]);

    const matrix = await getPayrollMatrix({ start: "2025-10-01", end: "2025-10-02" }, sql);
    assert.deepEqual(matrix.days, ["2025-10-01", "2025-10-02"]);
    assert.equal(matrix.rows.length, 2);

    const anaRow = matrix.rows.find((row) => row.staffId === 1);
    assert(anaRow);
    assert.equal(anaRow.cells[0].hours, 1.5);
    assert.equal(anaRow.cells[0].approvedHours, null);
    assert.equal(anaRow.cells[1].hours, 2.25);
    assert(anaRow.cells[1].approved);
    assert.equal(anaRow.cells[1].approvedHours, 2.25);

    const benRow = matrix.rows.find((row) => row.staffId === 2);
    assert(benRow);
    assert.equal(benRow.cells[0].hours, 0);
    assert.equal(benRow.cells[0].approvedHours, null);
    assert.equal(benRow.cells[1].hours, 3);
    assert.equal(benRow.cells[1].approvedHours, null);
  });

  it("normalizes matrix work dates regardless of driver shape", async () => {
    const { sql } = createMockSqlClient([
      {
        match: /staff_day_matrix_local_v/,
        rows: [
          {
            staff_id: 7,
            staff_name: "Fecha",
            work_date: new Date("2025-10-01T00:00:00Z"),
            total_hours: 1,
            approved_hours: null,
            horas_mostrar: 1,
            approved: false,
            has_edits: false,
          },
          {
            staff_id: 7,
            staff_name: "Fecha",
            work_date: "2025-10-02T05:00:00.000Z",
            total_hours: 2,
            approved_hours: null,
            horas_mostrar: 2,
            approved: false,
            has_edits: false,
          },
        ],
      },
    ]);

    const matrix = await getPayrollMatrix({ start: "2025-10-01", end: "2025-10-02" }, sql);
    assert.deepEqual(matrix.days, ["2025-10-01", "2025-10-02"]);
    assert.equal(matrix.rows.length, 1);
    const onlyRow = matrix.rows[0];
    assert.equal(onlyRow.cells[0].date, "2025-10-01");
    assert.equal(onlyRow.cells[1].date, "2025-10-02");
  });
});

it("throws HttpError when staff missing in approveDay", async () => {
  const { sql } = createMockSqlClient([
    { match: /FROM public\.staff_members/, rows: [{ exists: false }] },
  ]);
  await assert.rejects(
    () => approveDay({ staffId: 99, workDate: "2025-10-05", approvedBy: null }, sql),
    (error) => error instanceof HttpError && error.status === 404,
  );
});
