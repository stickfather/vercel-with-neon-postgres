// Types for Teacher Coverage & Load Panel (Personnel)

// Module 2: At a Glance KPI Strip
export type PersonnelKpiSnapshot = {
  bestCoveredHour: {
    hour: number;
    ratio: number;
  } | null;
  worstLoadHour: {
    hour: number;
    ratio: number;
  } | null;
  hoursAtRisk: number;
};

// Module 3: Staffing Load Curve
export type PersonnelCoverageByHour = {
  hour_of_day: number;
  minutos_estudiantes: number;
  minutos_personal: number;
  carga_relativa: number;
  estado_cobertura: string;
};

// Module 4: Student Load per Teacher
export type PersonnelStudentLoad = {
  hour_of_day: number;
  minutos_estudiantes: number;
  minutos_personal: number;
  estudiantes_por_profesor: number;
};

// Module 5: Coverage by Time Blocks
export type PersonnelStaffingMix = {
  bloque: string;
  minutos_estudiantes: number;
  minutos_personal: number;
  ratio_estudiantes_personal: number;
};

// Module 7: AI Manager Notes
export type PersonnelManagerNotes = {
  summary: string;
  bullets: string[];
};

// Full Panel Data
export type PersonnelPanelData = {
  coverageByHour: PersonnelCoverageByHour[];
  studentLoad: PersonnelStudentLoad[];
  staffingMixByBand: PersonnelStaffingMix[];
  kpiSnapshot: PersonnelKpiSnapshot;
  managerNotes: PersonnelManagerNotes;
};
