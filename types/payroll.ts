export type PayrollMatrixCell = {
  date: string;
  hours: number;
  approved: boolean;
  approvedHours: number | null;
  hasEdits?: boolean;
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
  originalCheckinLocal?: string | null;
  originalCheckoutLocal?: string | null;
  originalSessionId?: number | null;
  replacementSessionId?: number | null;
  isOriginalRecord?: boolean;
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
