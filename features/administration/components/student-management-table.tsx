"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { StudentManagementEntry } from "@/features/administration/data/students";

type Props = {
  students: StudentManagementEntry[];
};

export function StudentManagementTable({ students }: Props) {
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        dateStyle: "medium",
      }),
    [],
  );

  const formatDate = (value: string | null, withTime = true) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }
    return withTime ? dateTimeFormatter.format(parsed) : dateFormatter.format(parsed);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex flex-col gap-2 text-brand-ink">
          <h2 className="text-lg font-bold text-brand-deep">Resumen de estudiantes</h2>
          <p className="text-sm text-brand-ink-muted">
            {students.length ? (
              <>
                Gestiona <strong className="font-semibold text-brand-deep">{students.length}</strong> estudiantes activos. Usa los enlaces para profundizar en cada perfil.
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
                <th scope="col" className="px-6 py-3 font-semibold text-brand-deep">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">
                  Última lección
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">
                  Última asistencia
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">
                  Banderas
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">
                  Seguimiento
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">
                  Perfil
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink-muted/15 text-sm text-brand-ink">
              {students.map((student) => {
                const flagText = student.flags.length
                  ? student.flags.join(", ")
                  : "—";
                const lessonLabel = student.lastLesson
                  ? student.lastLesson
                  : student.lastLessonId
                  ? `Lección ${student.lastLessonId}`
                  : "Sin registro";
                const progressionLabel =
                  student.allowsProgression == null
                    ? "Pendiente"
                    : student.allowsProgression
                    ? "Permitida"
                    : "Revisar";
                const progressionClasses =
                  student.allowsProgression == null
                    ? "bg-brand-deep-soft text-brand-deep"
                    : student.allowsProgression
                    ? "bg-brand-teal-soft text-brand-teal"
                    : "bg-brand-orange/20 text-brand-orange";

                return (
                  <tr key={student.id} className="hover:bg-brand-teal-soft/25">
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-brand-deep">{student.fullName}</span>
                        <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
                          Primera lección: {formatDate(student.firstLessonAt, false)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-ink">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-brand-deep-soft">
                          {student.status ?? "Sin estado"}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-brand-ink-muted">
                          Actualizado: {formatDate(student.statusUpdatedAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-brand-deep">{lessonLabel}</span>
                        <span className="text-[11px] uppercase tracking-wide text-brand-ink-muted">
                          {formatDate(student.lastLessonAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-brand-ink">
                        {formatDate(student.lastAttendanceAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-ink">
                      <div className="flex flex-col gap-1">
                        <span>{flagText}</span>
                        <span className="text-[11px] uppercase tracking-wide text-brand-ink-muted">
                          {student.flagsUpdatedAt
                            ? `Actualizado: ${formatDate(student.flagsUpdatedAt)}`
                            : "Sin historial"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${progressionClasses}`}
                        >
                          {progressionLabel}
                        </span>
                        <span className="text-xs text-brand-ink-muted">
                          Responsable: {student.instructiveOwner ?? "—"}
                        </span>
                      </div>
                    </td>
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
                  <td colSpan={7} className="px-6 py-6 text-center text-sm text-brand-ink-muted">
                    No encontramos estudiantes en la vista de gestión. Revisa los filtros o la configuración de la base de datos.
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
