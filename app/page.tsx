import Image from "next/image";
import Link from "next/link";
import hero from "@/assets/home.png";
import { AttendanceBoard } from "@/components/attendance-board";
import {
  getActiveAttendances,
  type ActiveAttendance,
} from "./db";

type SearchParams = {
  saludo?: string;
  despedida?: string;
  nombre?: string;
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function decodeName(nombre?: string) {
  if (!nombre) return "";
  try {
    return decodeURIComponent(nombre);
  } catch (error) {
    return nombre;
  }
}

function buildMessage({ saludo, despedida, nombre }: SearchParams) {
  const safeName = decodeName(nombre);

  if (saludo) {
    return {
      tone: "positivo" as const,
      text: `¡Bienvenido/a, ${safeName || "estudiante"}! Tu registro quedó confirmado.`,
    };
  }

  if (despedida) {
    return {
      tone: "informativo" as const,
      text: `¡Hasta pronto, ${safeName || "estudiante"}! Gracias por compartir esta sesión con nosotros.`,
    };
  }

  return null;
}

function MessageBanner({
  message,
}: {
  message: ReturnType<typeof buildMessage>;
}) {
  if (!message) return null;

  const toneStyles =
    message.tone === "positivo"
      ? "border-[rgba(0,191,166,0.45)] bg-white/85"
      : "border-[rgba(255,122,35,0.45)] bg-white/80";

  return (
    <div
      className={`w-full max-w-3xl rounded-3xl border px-6 py-4 text-center text-lg font-semibold shadow-lg backdrop-blur ${toneStyles}`}
    >
      {message.text}
    </div>
  );
}

async function resolveSearchParams(
  searchParams: PageProps["searchParams"],
): Promise<SearchParams | undefined> {
  if (!searchParams) {
    return undefined;
  }

  const resolved = await searchParams;
  if (!resolved) {
    return undefined;
  }

  const saludoRaw = resolved.saludo;
  const despedidaRaw = resolved.despedida;
  const nombreRaw = resolved.nombre;

  return {
    saludo: Array.isArray(saludoRaw) ? saludoRaw[0] : saludoRaw,
    despedida: Array.isArray(despedidaRaw) ? despedidaRaw[0] : despedidaRaw,
    nombre: Array.isArray(nombreRaw) ? nombreRaw[0] : nombreRaw,
  };
}

export default async function Home({ searchParams }: PageProps) {
  let attendances: ActiveAttendance[] = [];
  let dataError: string | null = null;
  const resolvedParams = await resolveSearchParams(searchParams);

  try {
    attendances = await getActiveAttendances();
  } catch (error) {
    console.error("No se pudieron cargar las asistencias", error);
    dataError =
      "No pudimos conectar con la base de datos. La lista puede estar incompleta por ahora.";
  }

  const message = resolvedParams ? buildMessage(resolvedParams) : null;

  return (
    <div className="relative flex min-h-screen flex-col">
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 py-12 md:px-10 lg:px-16">
        <div className="flex w-full flex-col items-center gap-10 text-center md:gap-12">
          <MessageBanner message={message} />
          <section className="grid w-full gap-8 rounded-[40px] border border-[rgba(0,191,166,0.18)] bg-white/80 p-8 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.2fr_1fr] lg:items-center lg:p-12">
            <div className="flex flex-col gap-6 text-left">
              <p className="inline-flex items-center justify-start gap-2 text-xs font-semibold uppercase tracking-[0.45em] text-brand-teal">
                Inglés Rápido · Manta
              </p>
              <h1 className="text-4xl font-black leading-tight text-brand-deep sm:text-5xl lg:text-6xl">
                ¡Llegamos a Manta!
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-brand-ink-soft sm:text-xl">
                Te damos la bienvenida a nuestro centro de aprendizaje. Regístrate para tu clase de hoy, revisa quién ya está en la sala y vive la experiencia <span className="font-semibold text-brand-teal">#YouCanDoIt</span> de Inglés Rápido.
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                <Link
                  href="/registro"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-7 py-3 text-base font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                >
                  Registrar asistencia
                </Link>
                <Link
                  href="/registro"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#00bfa6] px-6 py-3 text-base font-semibold text-brand-teal transition hover:bg-[#00bfa6] hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a23]"
                >
                  Ir al kiosco
                </Link>
              </div>
            </div>
            <div className="relative mx-auto h-72 w-full max-w-sm overflow-hidden rounded-[32px] border border-[rgba(0,191,166,0.25)] bg-[radial-gradient(circle_at_30%_25%,rgba(0,191,166,0.3),transparent_55%),radial-gradient(circle_at_75%_75%,rgba(255,122,35,0.24),transparent_60%)] p-4 shadow-2xl">
              <div className="absolute inset-0 rounded-[28px] border border-white/60"></div>
              <Image
                src={hero}
                alt="Estudiante celebrando el inicio de clases"
                className="h-full w-full rounded-[24px] object-cover"
                priority
              />
            </div>
          </section>
        </div>

        <section className="mt-14 flex w-full flex-col gap-6 rounded-[36px] border border-[rgba(0,191,166,0.16)] bg-white/80 p-8 shadow-2xl backdrop-blur-lg md:p-12">
          <header className="flex flex-col gap-2 text-left md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-brand-deep md:text-3xl">
                Estudiantes actualmente en clase
              </h2>
              <p className="text-base text-brand-ink-muted md:text-lg">
                Presiona tu nombre cuando quieras retirarte. Cerraremos sesiones automáticamente a las <span className="font-semibold text-brand-teal">20:30</span> si olvidas salir.
              </p>
            </div>
            <span className="inline-flex items-center justify-center rounded-full bg-brand-teal px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow">
              {attendances.length} {attendances.length === 1 ? "estudiante" : "estudiantes"}
            </span>
          </header>
          {dataError && (
            <p className="rounded-3xl border border-brand-orange bg-white/85 px-5 py-3 text-sm font-medium text-brand-ink">
              {dataError}
            </p>
          )}
          <AttendanceBoard attendances={attendances} />
        </section>
      </main>
    </div>
  );
}
