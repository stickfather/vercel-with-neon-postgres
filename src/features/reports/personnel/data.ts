import { getSqlClient, normalizeRows } from "@/lib/db/client";
import type {
  PersonnelPanelData,
  PersonnelCoverageByHour,
  PersonnelStudentLoad,
  PersonnelStaffingMix,
  PersonnelKpiSnapshot,
  PersonnelManagerNotes,
} from "@/types/personnel";

type SqlClient = ReturnType<typeof getSqlClient>;

/**
 * Fetch personnel panel data from mgmt views
 */
export async function getPersonnelPanelData(
  sql: SqlClient = getSqlClient()
): Promise<PersonnelPanelData> {
  // Fetch all three views in parallel
  const [coverageRows, loadRows, mixRows] = await Promise.all([
    sql`
      SELECT 
        hour_of_day, 
        minutos_estudiantes, 
        minutos_personal, 
        carga_relativa, 
        estado_cobertura
      FROM mgmt.personnel_peak_load_coverage_v
      WHERE hour_of_day BETWEEN 8 AND 20
      ORDER BY hour_of_day
    `,
    sql`
      SELECT 
        hour_of_day, 
        minutos_estudiantes, 
        minutos_personal, 
        estudiantes_por_profesor
      FROM mgmt.personnel_student_load_v
      WHERE hour_of_day BETWEEN 8 AND 20
      ORDER BY hour_of_day
    `,
    sql`
      SELECT 
        bloque, 
        minutos_estudiantes, 
        minutos_personal, 
        ratio_estudiantes_personal
      FROM mgmt.personnel_staffing_mix_v
      ORDER BY bloque
    `,
  ]);

  // Normalize rows
  const normalizedCoverage = normalizeRows<PersonnelCoverageByHour>(coverageRows);
  const normalizedLoad = normalizeRows<PersonnelStudentLoad>(loadRows);
  const normalizedMix = normalizeRows<PersonnelStaffingMix>(mixRows);

  // Ensure all hours 08-20 are present
  const coverageByHour = fillMissingHours(normalizedCoverage);
  const studentLoad = fillMissingHoursLoad(normalizedLoad);
  
  // Normalize staffing mix to handle null ratios
  const staffingMixByBand = normalizedMix.map(mix => ({
    ...mix,
    minutos_estudiantes: mix.minutos_estudiantes ?? 0,
    minutos_personal: mix.minutos_personal ?? 0,
    ratio_estudiantes_personal: mix.ratio_estudiantes_personal ?? 0,
  }));

  // Calculate KPI snapshot
  const kpiSnapshot = calculateKpiSnapshot(coverageByHour);

  // Generate manager notes
  const managerNotes = generateManagerNotes(
    coverageByHour,
    studentLoad,
    staffingMixByBand
  );

  return {
    coverageByHour,
    studentLoad,
    staffingMixByBand,
    kpiSnapshot,
    managerNotes,
  };
}

/**
 * Fill missing hours (08-20) with zero values for coverage data
 */
function fillMissingHours(
  rows: PersonnelCoverageByHour[]
): PersonnelCoverageByHour[] {
  const hourMap = new Map<number, PersonnelCoverageByHour>();
  
  rows.forEach((row) => {
    // Ensure numeric fields are never null
    const normalized = {
      ...row,
      minutos_estudiantes: row.minutos_estudiantes ?? 0,
      minutos_personal: row.minutos_personal ?? 0,
      carga_relativa: row.carga_relativa ?? 0,
      estado_cobertura: row.estado_cobertura || "No Coverage",
    };
    hourMap.set(normalized.hour_of_day, normalized);
  });

  const result: PersonnelCoverageByHour[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    const existing = hourMap.get(hour);
    if (existing) {
      result.push(existing);
    } else {
      result.push({
        hour_of_day: hour,
        minutos_estudiantes: 0,
        minutos_personal: 0,
        carga_relativa: 0,
        estado_cobertura: "No Coverage",
      });
    }
  }

  return result;
}

/**
 * Fill missing hours (08-20) with zero values for load data
 */
function fillMissingHoursLoad(
  rows: PersonnelStudentLoad[]
): PersonnelStudentLoad[] {
  const hourMap = new Map<number, PersonnelStudentLoad>();
  
  rows.forEach((row) => {
    // Ensure numeric fields are never null
    const normalized = {
      ...row,
      minutos_estudiantes: row.minutos_estudiantes ?? 0,
      minutos_personal: row.minutos_personal ?? 0,
      estudiantes_por_profesor: row.estudiantes_por_profesor ?? 0,
    };
    hourMap.set(normalized.hour_of_day, normalized);
  });

  const result: PersonnelStudentLoad[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    const existing = hourMap.get(hour);
    if (existing) {
      result.push(existing);
    } else {
      result.push({
        hour_of_day: hour,
        minutos_estudiantes: 0,
        minutos_personal: 0,
        estudiantes_por_profesor: 0,
      });
    }
  }

  return result;
}

/**
 * Calculate KPI snapshot from coverage data
 */
function calculateKpiSnapshot(
  coverage: PersonnelCoverageByHour[]
): PersonnelKpiSnapshot {
  const validHours = coverage.filter((h) => h.minutos_personal > 0);

  // Best covered hour (min ratio with staff > 0)
  let bestCoveredHour = null;
  if (validHours.length > 0) {
    const best = validHours.reduce((min, hour) => 
      hour.carga_relativa < min.carga_relativa ? hour : min
    );
    bestCoveredHour = {
      hour: best.hour_of_day,
      ratio: best.carga_relativa,
    };
  }

  // Worst load hour (max ratio)
  let worstLoadHour = null;
  if (coverage.length > 0) {
    const worst = coverage.reduce((max, hour) => 
      hour.carga_relativa > max.carga_relativa ? hour : max
    );
    worstLoadHour = {
      hour: worst.hour_of_day,
      ratio: worst.carga_relativa,
    };
  }

  // Hours at risk (>3.00 ratio)
  const hoursAtRisk = coverage.filter((h) => h.carga_relativa > 3.0).length;

  return {
    bestCoveredHour,
    worstLoadHour,
    hoursAtRisk,
  };
}

/**
 * Generate AI manager notes based on data
 */
function generateManagerNotes(
  coverage: PersonnelCoverageByHour[],
  studentLoad: PersonnelStudentLoad[],
  staffingMix: PersonnelStaffingMix[]
): PersonnelManagerNotes {
  // Safety check for empty data
  if (coverage.length === 0) {
    return {
      summary: "No coverage data available for analysis.",
      bullets: [
        "Ensure staff attendance tracking is active.",
        "Verify student session data is being recorded.",
        "Check database views are populated with recent data.",
      ],
    };
  }

  // Find worst hour
  const worstHour = coverage.reduce((max, hour) => 
    hour.carga_relativa > max.carga_relativa ? hour : max
  );

  // Find highest pressure block (with safety check)
  let worstBlock = staffingMix.length > 0 
    ? staffingMix.reduce((max, block) => 
        block.ratio_estudiantes_personal > max.ratio_estudiantes_personal ? block : max
      )
    : null;

  // Count hours at risk
  const atRiskCount = coverage.filter((h) => h.carga_relativa > 3.0).length;

  // Build summary (with null safety)
  let summary = "";
  const ratio = worstHour.carga_relativa ?? 0;
  
  if (ratio <= 2.0) {
    summary = "Coverage is well-balanced across the day. All hours are adequately staffed with ratios under 2.0×.";
  } else if (ratio <= 3.0) {
    summary = `Coverage is generally adequate with some tight spots. The highest load is ${worstHour.hour_of_day}:00 at ${ratio.toFixed(2)}×, indicating moderate pressure on teachers.`;
  } else {
    if (worstHour.minutos_personal === 0) {
      summary = `Coverage has critical gaps. ${worstHour.hour_of_day}:00 has no staff coverage while students are active. Immediate staffing required.`;
    } else {
      summary = `Coverage is under-resourced at peak hours. The highest load is ${worstHour.hour_of_day}:00 at ${ratio.toFixed(2)}×, indicating high pressure on teachers.`;
    }
  }

  // Build action bullets
  const bullets: string[] = [];

  if (atRiskCount > 0) {
    bullets.push(`Address ${atRiskCount} hour${atRiskCount === 1 ? '' : 's'} with load ratio above 3.0× to prevent teacher burnout.`);
  }

  if (worstBlock && worstBlock.ratio_estudiantes_personal > 3.0) {
    const blockRatio = worstBlock.ratio_estudiantes_personal ?? 0;
    bullets.push(`Highest-pressure block is ${worstBlock.bloque} with ${blockRatio.toFixed(2)}× ratio. Consider adding one teacher during this window.`);
  }

  // Find hours with no coverage
  const noCoverage = coverage.filter((h) => h.minutos_personal === 0 && h.minutos_estudiantes > 0);
  if (noCoverage.length > 0) {
    bullets.push(`${noCoverage.length} hour${noCoverage.length === 1 ? '' : 's'} ha${noCoverage.length === 1 ? 's' : 've'} no staff coverage. Schedule teachers for ${noCoverage.map(h => `${h.hour_of_day}:00`).join(', ')}.`);
  }

  // Add general recommendation if we have less than 3 bullets
  if (bullets.length < 3) {
    bullets.push("Monitor week-over-week trends to identify emerging pressure patterns and adjust schedules proactively.");
  }

  return {
    summary,
    bullets: bullets.slice(0, 3), // Ensure exactly 3 bullets max
  };
}
