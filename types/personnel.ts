// Personnel analytics report types powered by final.* materialized views

export type StaffingMixHourRow = {
  hourOfDay: number | null;
  hourLabel: string;
  studentMinutes: number;
  staffMinutes: number;
  studentToStaffMinuteRatio: number | null;
  studentCount: number | null;
  staffCount: number | null;
};

export type StaffingHeatmapCell = {
  hourLabel: string;
  ratio: number | null;
  studentMinutes: number;
  staffMinutes: number;
};

export type PeakCoveragePoint = {
  hourLabel: string;
  studentMinutes: number;
  staffMinutes: number;
};

export type UnderOverRow = {
  hourLabel: string;
  studentMinutes: number;
  staffMinutes: number;
  ratio: number | null;
  gapMetric: number;
};

export type StudentLoadPerTeacherRow = {
  teacherId: string;
  teacherName: string;
  avgStudentsPerHour: number | null;
  avgStudentsPerDay: number | null;
};

export type StudentLoadGauge = {
  avgStudentsPerTeacher: number | null;
  targetStudentsPerTeacher: number | null;
  teacherCount: number;
};

export type TeacherUtilizationRow = {
  teacherId: string;
  teacherName: string;
  utilizationPct: number | null;
  minutesWithStudents: number;
  minutesClockedIn: number;
};

export type PersonnelReportResponse = {
  staffingMixByHour: StaffingHeatmapCell[];
  peakCoverage: PeakCoveragePoint[];
  studentLoadGauge: StudentLoadGauge;
  studentLoadPerTeacher: StudentLoadPerTeacherRow[];
  understaffedHours: UnderOverRow[];
  overstaffedHours: UnderOverRow[];
  teacherUtilization: TeacherUtilizationRow[];
  fallback: boolean;
  generatedAt: string;
};

export function createEmptyPersonnelReport(): PersonnelReportResponse {
  return {
    staffingMixByHour: [],
    peakCoverage: [],
    studentLoadGauge: { avgStudentsPerTeacher: null, targetStudentsPerTeacher: null, teacherCount: 0 },
    studentLoadPerTeacher: [],
    understaffedHours: [],
    overstaffedHours: [],
    teacherUtilization: [],
    fallback: true,
    generatedAt: new Date().toISOString(),
  };
}
