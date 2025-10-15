export type PayrollMatrixCell = {
  date: string;
  hours: number;
  approved: boolean;
};

export type PayrollMatrixRow = {
  staffId: number;
  staffName: string | null;
  cells: PayrollMatrixCell[];
};

export type PayrollMatrixResponse = {
  days: string[];
  rows: PayrollMatrixRow[];
};

export type DaySession = {
  sessionId: number;
  checkinTimeLocal: string | null;
  checkoutTimeLocal: string | null;
  minutes: number;
  hours: number;
};

export type MonthSummaryRow = {
  staffId: number;
  staffName: string | null;
  month: string;
  approvedHours: number;
  hourlyWage: number;
  approvedAmount: number;
  paid: boolean;
  paidAt: string | null;
  amountPaid: number | null;
  reference: string | null;
  paidBy: string | null;
};
