import Link from "next/link";
import {
  getLevelsWithLessons,
  getStudentDirectory,
} from "@/app/db";
import { CheckInForm } from "@/components/check-in-form";

export const revalidate = 0;

export default async function RegistroPage() {
  let students = [] as Awaited<ReturnType<typeof getStudentDirectory>>;
  let levels = [] as Awaited<ReturnType<typeof getLevelsWithLessons>>;
  let loadError: string | null = null;

  try {
    [students, levels] = await Promise.all([
      getStudentDirectory(),
      getLevelsWithLessons(),
    ]);
  } catch (error) {
    console.error("No se pudieron cargar los datos para el registro", error);
    loadError =
      "No pudimos conectar con la base de datos. Completa tu registro con ayuda del equipo.";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-12">
        <header className="flex flex-col items-start justify-between gap-4 rounded-[28px] bg-white/85 px-8 py-6 shadow-2xl backdrop-blur md:flex-row md:items-center">
          <div className="flex flex-col gap-1 text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-deep-soft">
              Inglés Rápido · Kiosco
            </span>
            <h1 className="text-3xl font-black text-brand-deep md:text-4xl">
              ¡Registra tu llegada!
            </h1>
            <p className="text-brand-ink-muted">
              Sigue los pasos para confirmar tu asistencia. Al finalizar volverás a la pantalla de bienvenida.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
          >
            Volver a inicio
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <CheckInForm
            students={students}
            levels={levels}
            disabled={!levels.length}
            initialError={loadError}
          />
          <aside className="flex flex-col gap-5 rounded-[32px] bg-white/80 px-7 py-9 shadow-2xl backdrop-blur">
            <h2 className="text-2xl font-bold text-brand-deep">¿Cómo funciona?</h2>
            <ol className="flex list-decimal flex-col gap-3 pl-5 text-brand-ink-muted">
              <li>Escribe tu nombre y selecciónalo de la lista.</li>
              <li>Elige el nivel donde estás estudiando.</li>
              <li>Selecciona la lección asignada para el día.</li>
              <li>Presiona “Confirmar asistencia”.</li>
              <li>Cuando termines, vuelve a tocar tu nombre en la pantalla principal.</li>
            </ol>
            <div className="rounded-[24px] border border-dashed border-brand-teal bg-white/60 px-5 py-4 text-sm text-brand-ink">
              <strong className="font-semibold text-brand-teal">Tip:</strong> Si no encuentras tu nombre, pídele apoyo a un asesor para actualizar la lista.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
