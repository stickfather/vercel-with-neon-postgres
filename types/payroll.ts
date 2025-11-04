export type PayrollDayStatus =
  | "pending"
  | "approved"
  | "edited_and_approved"
  | "edited_not_approved";

export type PayrollMatrixCell = {
  date: string;
  hours: number;
  approved: boolean;
  approvedHours: number | null;
  hasEdits?: boolean;
  editedAfterApproval?: boolean;
  edited?: boolean;
  dayStatus?: PayrollDayStatus;
  status?: PayrollDayStatus;
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
  staffId?: number;
  workDate?: string;
  originalCheckinLocal?: string | null;
  originalCheckoutLocal?: string | null;
  originalSessionId?: number | null;
  replacementSessionId?: number | null;
  isOriginalRecord?: boolean;
  editedCheckinLocal?: string | null;
  editedCheckoutLocal?: string | null;
  editedByStaffId?: number | null;
  editNote?: string | null;
  wasEdited?: boolean;
};

export type DayTotals = {
  totalMinutes: number;
  totalHours: number;
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
