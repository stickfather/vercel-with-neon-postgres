"use client";

import Link from "next/link";
import type { StudentManagementEntry } from "@/features/administration/data/students";

// Extend the imported row type with the flag fields we render here.
type FlagKey =
  | "isExamPreparation"
  | "hasSpecialNeeds"
  | "hasPaymentIssues"
  | "isLowProgress"
  | "isSlowProgress"
  | "isDropoutRisk";

type Row = StudentManagementEntry & Partial<Record<FlagKey, boolean>>;

type Props = {
  students: Row[];
};

const flagColumns: { key: FlagKey; label: string; description: string }[] = [
  { key: "isExamPreparation", label: "Ex", description: "Preparación para el examen" },
  { key: "hasSpecialNeeds", label: "NEE", description: "Necesidades educativas especiales" },
  { key: "hasPaymentIssues", label: "Pagos", description: "Alertas de pagos" },
  { key: "isLowProgress", label: "Progreso", description: "Progreso bajo" },
  { key: "isSlowProgress", label: "Ritmo", description: "Avance lento" },
  { key: "isDropoutRisk", label: "Riesgo", description: "Riesgo de deserción" },
];

export default function StudentManagementTable({ students }: Props) {
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
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">Nivel</th>
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">Estado</th>
                {flagColumns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="px-3 py-3 text-center font-semibold text-brand-deep"
                    title={column.description}
                  >
                    {column.label}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">Perfil</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-brand-ink-muted/15 text-sm text-brand-ink">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-brand-teal-soft/20">
                  <td className="px-6 py-3">
                    <span className="font-semibold text-brand-deep">{student.fullName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-brand-ink">{student.level ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-brand-deep-soft">{student.state ?? "Sin estado"}</span>
                  </td>

                  {flagColumns.map((column) => {
                    const isActive = Boolean(student[column.key]);
                    return (
                      <td key={column.key} className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                            isActive
                              ? "bg-brand-teal-soft text-brand-teal"
                              : "bg-brand-ink-muted/10 text-brand-ink-muted"
                          }`}
                          aria-label={`${column.description}: ${isActive ? "Sí" : "No"}`}
                        >
                          {isActive ? "Sí" : "—"}
                        </span>
                      </td>
                    );
                  })}

                  <td className="px-4 py-3">
                    {/* Use Next.js dynamic segment path directly */}
                    <Link
                      href={`/administracion/gestion-estudiantes/${student.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-teal transition hover:-translate-y-[1px] hover:opacity-90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                    >
                      Ver perfil
                    </Link>
                  </td>
                </tr>
              ))}

              {!students.length && (
                <tr>
                  <td
                    colSpan={flagColumns.length + 4}
                    className="px-6 py-6 text-center text-sm text-brand-ink-muted"
                  >
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
