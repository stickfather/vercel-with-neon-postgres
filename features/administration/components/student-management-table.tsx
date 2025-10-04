"use client";

import Link from "next/link";
import type { StudentManagementEntry } from "@/features/administration/data/students";

type Props = {
  students: StudentManagementEntry[];
};

type FlagKey =
  | "isNewStudent"
  | "isExamApproaching"
  | "isExamPreparation"
  | "hasSpecialNeeds"
  | "isAbsent7Days"
  | "isSlowProgress14Days"
  | "hasActiveInstructive"
  | "hasOverdueInstructive";

const FLAG_COLUMNS: ReadonlyArray<{ key: FlagKey; label: string }> = [
  { key: "isNewStudent", label: "Nuevo" },
  { key: "isExamApproaching", label: "Examen pronto" },
  { key: "isExamPreparation", label: "Prep. examen" },
  { key: "hasSpecialNeeds", label: "NEE" },
  { key: "isAbsent7Days", label: "Ausente 7d" },
  { key: "isSlowProgress14Days", label: "Progreso lento 14d" },
  { key: "hasActiveInstructive", label: "Instructivo activo" },
  { key: "hasOverdueInstructive", label: "Instructivo vencido" },
];

function FlagIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex min-w-[52px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${active ? "bg-brand-teal text-white" : "bg-brand-ink-muted/15 text-brand-ink"}`}
      aria-label={`${label}: ${active ? "sí" : "no"}`}
    >
      {active ? "Sí" : "No"}
    </span>
  );
}

function StudentManagementTable({ students }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex flex-col gap-2 text-brand-ink">
          <h2 className="text-lg font-bold text-brand-deep">Resumen de estudiantes</h2>
          <p className="text-sm text-brand-ink-muted">
            {students.length ? (
              <>
                Gestiona{" "}
                <strong className="font-semibold text-brand-deep">{students.length}</strong>{" "}
                estudiantes activos. Usa los enlaces para profundizar en cada perfil.
              </>
            ) : (
              "No hay estudiantes disponibles para mostrar."
            )}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_24px_58px_rgba(15,23,42,0.12)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-ink-muted/20 text-left">
            <thead className="bg-brand-deep-soft/30 text-xs uppercase tracking-wide text-brand-ink">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold text-brand-deep">Nombre</th>
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">Estado</th>
                {FLAG_COLUMNS.map((flag) => (
                  <th key={flag.key} scope="col" className="px-4 py-3 font-semibold text-brand-deep">
                    {flag.label}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">Perfil</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-brand-ink-muted/15 text-sm text-brand-ink">
              {students.map((student) => {
                return (
                  <tr key={student.id} className="hover:bg-brand-teal-soft/25">
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-brand-deep">
                          {student.fullName}
                        </span>
                        {student.level && (
                          <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
                            Nivel {student.level}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-brand-ink">
                      <span className="font-semibold text-brand-deep-soft">
                        {student.state ?? "Sin estado"}
                      </span>
                    </td>

                    {FLAG_COLUMNS.map((flag) => {
                      const isActive = Boolean(student[flag.key]);
                      return (
                        <td key={`${student.id}-${flag.key}`} className="px-4 py-3">
                          <FlagIndicator active={isActive} label={flag.label} />
                        </td>
                      );
                    })}

                    <td className="px-4 py-3">
                      <Link
                        href={`/administracion/gestion-estudiantes/${student.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-teal transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                      >
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {!students.length && (
                <tr>
                  <td colSpan={FLAG_COLUMNS.length + 3} className="px-6 py-6 text-center text-sm text-brand-ink-muted">
                    No encontramos estudiantes en la vista de gestión. Revisa los filtros o la
                    configuración de la base de datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Export both ways so any import style works
export { StudentManagementTable };
export default StudentManagementTable;
