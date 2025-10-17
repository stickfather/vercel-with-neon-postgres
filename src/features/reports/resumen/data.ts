import { cache } from "react";
import { listStudentManagementEntries } from "@/features/administration/data/students";
import type {
  GenHeader,
  LevelBands,
  LevelKPI,
  LevelStateBreakdown,
  LevelStateKey,
} from "@/types/reports.resumen";
import { getSqlClient, normalizeRows } from "@/lib/db/client";

const LEVEL_SORT_ORDER = ["PREA1", "A1", "A2", "B1", "B2", "C1", "C2", "C3"];

const STATE_SYNONYMS: Record<LevelStateKey, string[]> = {
  activo: ["activo", "activos", "active"],
  inactivo: ["inactivo", "inactivos", "inactive"],
  en_pausa: ["en_pausa", "en pausa", "paused", "pause", "on_hold", "on hold"],
  congelado: ["congelado", "congelada", "frozen", "freeze"],
  progreso_lento: [
    "progreso_lento",
    "progreso lento",
    "slow_progression",
    "slow progression",
    "slow",
  ],
  ausente: ["ausente", "ausentes", "absent"],
  graduado: ["graduado", "graduada", "graduated"],
  retirado: ["retirado", "retirada", "dropout", "dropped"],
  invalido: ["invalido", "inválido", "invalid"],
  prospecto: ["prospecto", "prospect"],
  otros: [],
};

const LEVEL_STATE_KEYS: LevelStateKey[] = [
  "activo",
  "inactivo",
  "en_pausa",
  "congelado",
  "progreso_lento",
  "ausente",
  "graduado",
  "retirado",
  "invalido",
  "prospecto",
  "otros",
];

type LevelStateCounts = Record<LevelStateKey, number> & { total: number };

const STATE_LOOKUP = new Map<string, LevelStateKey>();

LEVEL_STATE_KEYS.forEach((key) => {
  if (key !== "otros") {
    STATE_LOOKUP.set(key, key);
  }
  const synonyms = STATE_SYNONYMS[key] ?? [];
  synonyms.forEach((synonym) => {
    const slug = slugify(synonym);
    if (slug.length) {
      STATE_LOOKUP.set(slug, key);
    }
  });
});

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeStateKey(value: string | null | undefined): LevelStateKey {
  if (!value) return "otros";
  const slug = slugify(String(value));
  if (!slug) return "otros";
  return STATE_LOOKUP.get(slug) ?? "otros";
}

function normalizeLevelLabel(value: string | null | undefined): string {
  if (value == null) return "Sin nivel";
  const trimmed = String(value).trim();
  if (!trimmed.length) return "Sin nivel";
  const upper = trimmed.toUpperCase();
  if (LEVEL_SORT_ORDER.includes(upper)) {
    return upper;
  }
  if (/^[A-Z]\d$/i.test(trimmed)) {
    return upper;
  }
  if (upper === "SIN NIVEL") {
    return "Sin nivel";
  }
  return trimmed;
}

function getLevelSortValue(level: string) {
  const upper = level.toUpperCase();
  const index = LEVEL_SORT_ORDER.indexOf(upper);
  if (index !== -1) return index;
  if (upper === "SIN NIVEL") return LEVEL_SORT_ORDER.length + 1;
  return LEVEL_SORT_ORDER.length + 2;
}

function compareLevels(a: string, b: string) {
  const valueA = getLevelSortValue(a);
  const valueB = getLevelSortValue(b);
  if (valueA !== valueB) return valueA - valueB;
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

function createEmptyCounts(): LevelStateCounts {
  const counts = { total: 0 } as LevelStateCounts;
  LEVEL_STATE_KEYS.forEach((key) => {
    counts[key] = 0;
  });
  return counts;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function fetchResumenHeader(): Promise<GenHeader | null> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<GenHeader>>(await sql`SELECT * FROM mgmt.gen_header_v LIMIT 1`);
  if (!rows.length) return null;
  const row = rows[0];
  return {
    students_total: normalizeNumber(row.students_total),
    active_7d: normalizeNumber(row.active_7d),
    active_30d: normalizeNumber(row.active_30d),
    new_30d: normalizeNumber(row.new_30d),
    returning_30d: normalizeNumber(row.returning_30d),
    pct_on_pace: normalizeNullableNumber(row.pct_on_pace),
    median_session_minutes_30d: normalizeNullableNumber(row.median_session_minutes_30d),
    avg_study_hours_per_student_30d: normalizeNullableNumber(row.avg_study_hours_per_student_30d),
  };
}

async function fetchLevelBands(): Promise<LevelBands[]> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LevelBands>>(await sql`
    SELECT level, band_0_33, band_34_66, band_67_99, band_100
    FROM mgmt.gen_level_progress_bands_v
    ORDER BY level
  `);
  return rows.map((row) => ({
    level: String(row.level ?? "—"),
    band_0_33: normalizeNumber(row.band_0_33),
    band_34_66: normalizeNumber(row.band_34_66),
    band_67_99: normalizeNumber(row.band_67_99),
    band_100: normalizeNumber(row.band_100),
  }));
}

async function fetchLevelKpis(): Promise<LevelKPI[]> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LevelKPI>>(await sql`
    SELECT level, students, active_30d_pct, on_pace_pct, median_lei_30d, median_months_to_finish
    FROM mgmt.gen_level_kpis_v
    ORDER BY level
  `);
  return rows.map((row) => ({
    level: String(row.level ?? "—"),
    students: normalizeNumber(row.students),
    active_30d_pct: normalizeNullableNumber(row.active_30d_pct),
    on_pace_pct: normalizeNullableNumber(row.on_pace_pct),
    median_lei_30d: normalizeNullableNumber(row.median_lei_30d),
    median_months_to_finish: normalizeNullableNumber(row.median_months_to_finish),
  }));
}

async function fetchLevelStates(): Promise<LevelStateBreakdown[]> {
  const entries = await listStudentManagementEntries();

  if (!entries.length) {
    return [];
  }

  const levelMap = new Map<string, LevelStateCounts>();

  for (const entry of entries) {
    const levelLabel = normalizeLevelLabel(entry.level);
    const stateKey = normalizeStateKey(entry.state);
    const bucket = levelMap.get(levelLabel);

    if (!bucket) {
      const nextBucket = createEmptyCounts();
      nextBucket[stateKey] += 1;
      nextBucket.total += 1;
      levelMap.set(levelLabel, nextBucket);
      continue;
    }

    bucket[stateKey] += 1;
    bucket.total += 1;
  }

  return Array.from(levelMap.entries())
    .sort(([levelA], [levelB]) => compareLevels(levelA, levelB))
    .map(([level, counts]) => {
      const breakdown: LevelStateBreakdown = {
        level,
        total: counts.total,
        activo: counts.activo,
        inactivo: counts.inactivo,
        en_pausa: counts.en_pausa,
        congelado: counts.congelado,
        progreso_lento: counts.progreso_lento,
        ausente: counts.ausente,
        graduado: counts.graduado,
        retirado: counts.retirado,
        invalido: counts.invalido,
        prospecto: counts.prospecto,
        otros: counts.otros,
      };
      return breakdown;
    });
}

export const getResumenHeader = cache(fetchResumenHeader);
export const getLevelBands = cache(fetchLevelBands);
export const getLevelKpis = cache(fetchLevelKpis);
export const getLevelStates = cache(fetchLevelStates);

export async function getResumenGeneralData() {
  const [header, bands, kpis, states] = await Promise.all([
    getResumenHeader(),
    getLevelBands(),
    getLevelKpis(),
    getLevelStates(),
  ]);

  return { header, bands, kpis, states };
}
