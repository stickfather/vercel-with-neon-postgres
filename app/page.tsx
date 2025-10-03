import Image from "next/image";
import Link from "next/link";
import hero from "@/assets/home.png";

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
      ? "border-brand-teal bg-white/80"
      : "border-brand-orange bg-white/70";

  return (
    <div
      className={`w-full max-w-3xl rounded-3xl border px-6 py-4 text-center text-lg font-semibold shadow-md ${toneStyles}`}
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
  const resolvedParams = await resolveSearchParams(searchParams);
  const message = resolvedParams ? buildMessage(resolvedParams) : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-72 w-72 -rotate-[16deg] rounded-[46px] bg-[#ffe1c7] opacity-80 blur-sm" />
        <div className="absolute right-4 top-28 h-64 w-64 rotate-[14deg] rounded-[40px] bg-[#b7f6ec] opacity-70 blur-sm" />
        <div className="absolute bottom-0 left-1/2 h-[520px] w-[125%] -translate-x-1/2 rounded-t-[220px] bg-gradient-to-r from-[#ffe7ce] via-[#ffffffef] to-[#c8f5ed]" />
      </div>
      <Link
        href="/administracion"
        className="absolute right-6 top-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-ink-muted shadow-sm transition hover:text-brand-teal focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
      >
        Panel administrativo
      </Link>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16 md:px-10 lg:px-16">
        <div className="rounded-[44px] border border-white/70 bg-white/90 p-10 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-col gap-10">
            <MessageBanner message={message} />
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
              <div className="flex flex-col items-start gap-8 text-left">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-teal-soft px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-brand-teal">
                  Welcome to Inglés Rápido · Manta
                </span>
                <h1 className="text-4xl font-black leading-tight text-brand-deep sm:text-5xl">
                  ¡Tu aventura bilingüe empieza con una sonrisa!
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-brand-ink-soft sm:text-xl">
                  Vive la energía de nuestro hub costero: música, high-fives y clases dinámicas listas para ti. Marca tu asistencia y corre a tu aula en cuestión de segundos.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/registro"
                    className="cta-ripple inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-9 py-4 text-base font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  >
                    Haz check-in aquí
                  </Link>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-brand-ink-muted">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-[#2f9d6a]" /> Niveles A1-A2
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-[#ff7a23]" /> Talleres conversacionales
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-[#2e88c9]" /> Tutorías express
                  </span>
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="relative w-full max-w-md overflow-hidden rounded-[48px] border border-white/70 bg-white/90 p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur">
                  <div className="absolute -top-10 right-6 inline-flex rotate-[12deg] rounded-full bg-[#ffe5d5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-deep">
                    Smile!
                  </div>
                  <div className="absolute -bottom-10 left-6 inline-flex rotate-[-10deg] rounded-full bg-[#d8f5ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-deep">
                    #YouCanDoIt
                  </div>
                  <div className="relative h-80 w-full overflow-hidden rounded-[38px] bg-gradient-to-br from-[#ff7a23e6] via-[#ffc23acc] to-[#00bfa6cc] p-3">
                    <div className="absolute inset-0 rounded-[32px] border border-white/45" />
                    <Image
                      src={hero}
                      alt="Estudiantes celebrando en la sede de Inglés Rápido"
                      className="h-full w-full rounded-[28px] object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
