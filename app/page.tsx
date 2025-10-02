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
      ? "border-brand-teal bg-[#e6fbf7] text-brand-deep"
      : "border-brand-orange bg-[#fff4ec] text-brand-deep";

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
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center md:px-10">
        <div className="flex w-full flex-col items-center gap-8">
          <MessageBanner message={message} />
          <section className="flex w-full flex-col items-center gap-8 rounded-[44px] bg-white/85 p-10 text-brand-deep shadow-2xl backdrop-blur md:p-14">
            <div className="flex w-full justify-center">
              <Image
                src={symbol}
                alt="Logotipo del South American Language Center Manta"
                priority
                className="w-full max-w-xs drop-shadow-lg sm:max-w-sm"
              />
            </div>
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-deep-soft">
                Inglés Rápido · Manta
              </p>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl">
                ¡Bienvenidos al kiosco de asistencia!
              </h1>
              <p className="max-w-2xl text-lg text-brand-ink-muted sm:text-xl">
                Estamos listos para comenzar tu clase de hoy. Toca el botón para seguir al registro, confirma tus datos y prepárate
                para vivir la experiencia <span className="font-semibold text-brand-teal">Inglés Rápido</span> en Manta.
              </p>
            </div>
            <Link
              href="/registro"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-10 py-4 text-lg font-semibold uppercase tracking-wide text-white shadow-xl transition hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Toca aquí para continuar
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
