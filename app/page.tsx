import Image from "next/image";
import Link from "next/link";
import symbol from "@/assets/manta-symbol.svg";

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
      ? "border-brand-teal bg-[#ddf4ef] text-brand-deep"
      : "border-brand-orange bg-[#ffe8d7] text-brand-deep";

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
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 text-center md:px-10">
        <div className="flex w-full flex-col items-center gap-10">
          <MessageBanner message={message} />
          <section className="relative flex w-full flex-col items-center gap-10 rounded-[44px] border border-[#ffe0c2] bg-white p-12 text-brand-deep shadow-xl md:p-16">
            <div className="pointer-events-none absolute -top-12 left-12 hidden h-24 w-24 rounded-3xl bg-[#ffe0c2] sm:block" />
            <div className="pointer-events-none absolute -bottom-14 right-10 hidden h-20 w-20 rounded-3xl bg-[#5cd6ca] sm:block" />
            <div className="relative flex w-full justify-center">
              <Image
                src={symbol}
                alt="Símbolo de Inglés Rápido Manta"
                priority
                className="w-full max-w-xs drop-shadow-xl sm:max-w-sm"
              />
            </div>
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-deep-soft">
                Inglés Rápido · Manta
              </p>
              <h1 className="text-4xl font-black leading-tight text-brand-deep sm:text-5xl">
                Bienvenidos a Inglés Rápido Manta
              </h1>
              <p className="max-w-2xl text-base text-brand-ink-muted sm:text-lg">
                Pulsa continuar para registrar tu asistencia, elegir tu nivel y sumarte a la clase.
              </p>
            </div>
            <Link
              href="/registro"
              className="cta-ripple inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-12 py-5 text-xl font-semibold uppercase tracking-wide text-white shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Haz clic aquí para continuar
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
