"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { StaffDirectoryEntry } from "@/features/staff/data/queries";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import {
  generateQueueId,
  isOfflineError,
  readQueue,
  type OfflineQueueItem,
  writeQueue,
} from "@/lib/offline/queue-helpers";

type StatusState = { message: string } | null;

type ToastState = { message: string; tone: "success" | "error" };

type Props = {
  staffMembers: StaffDirectoryEntry[];
  disabled?: boolean;
  initialError?: string | null;
};

const STAFF_QUEUE_STORAGE_KEY = "ir_offline_staff_checkins_v1";
const STAFF_OFFLINE_MESSAGE =
  "Sin conexión a internet. Guardamos tu registro y lo enviaremos cuando vuelva la conexión.";

type PendingStaffCheckIn = OfflineQueueItem<{ staffId: number }>;

export function StaffCheckInForm({
  staffMembers,
  disabled = false,
  initialError = null,
}: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [initialAlert, setInitialAlert] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pendingOfflineCheckIns, setPendingOfflineCheckIns] = useState<
    PendingStaffCheckIn[]
  >([]);
  const [isSyncingOfflineQueue, setIsSyncingOfflineQueue] = useState(false);
  const [fullScreenMessage, setFullScreenMessage] = useState<
    | { tone: "success" | "error"; message: string; subtext?: string }
    | null
  >(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPendingOfflineCheckIns(
      readQueue<PendingStaffCheckIn["payload"]>(STAFF_QUEUE_STORAGE_KEY),
    );

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const pendingOfflineCount = pendingOfflineCheckIns.length;

  const selectedStaffMember = useMemo(() => {
    if (selectedStaffId == null) {
      return null;
    }
    return staffMembers.find((member) => member.id === selectedStaffId) ?? null;
  }, [selectedStaffId, staffMembers]);

  const filteredStaff = useMemo(() => {
    if (!normalizedSearch) {
      return staffMembers.slice(0, 8);
    }

    return staffMembers
      .filter((member) =>
        member.fullName.trim().toLowerCase().includes(normalizedSearch),
      )
      .slice(0, 8);
  }, [staffMembers, normalizedSearch]);

  const isFormDisabled = disabled;

  useEffect(() => {
    setInitialAlert(initialError);
  }, [initialError]);

  const resolveSuccessMessage = useCallback(
    (staffId: number) => {
      const selectedMember = staffMembers.find((member) => member.id === staffId);
      return selectedMember
        ? `${selectedMember.fullName.trim()} ya está registrado.`
        : "¡Registro del personal confirmado!";
    },
    [staffMembers],
  );

  const scheduleWelcomeRedirect = useCallback(
    (
      {
        name,
        delay = 1600,
        reason = "checkin",
      }: {
        name?: string | null;
        delay?: number;
        reason?: "checkin" | "checkout" | "none";
      } = { reason: "checkin" },
    ) => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }

      redirectTimeoutRef.current = setTimeout(() => {
        const trimmedName = name?.trim();
        const params = new URLSearchParams();

        if (reason === "checkin") {
          params.set("saludo", "1");
        } else if (reason === "checkout") {
          params.set("despedida", "1");
        }

        if (
          trimmedName &&
          (reason === "checkin" || reason === "checkout")
        ) {
          params.set("nombre", trimmedName);
        }

        const target = params.size ? `/?${params.toString()}` : "/";
        startTransition(() => {
          router.push(target);
        });
      }, delay);
    },
    [router, startTransition],
  );

  const handlePostSubmitSuccess = useCallback(
    (
      staffId: number,
      options?: {
        message?: string;
        statusMessage?: string | null;
        welcomeName?: string | null;
        redirectDelayMs?: number;
      },
    ) => {
      const message = options?.message ?? resolveSuccessMessage(staffId);

      if (options?.statusMessage !== undefined) {
        if (options.statusMessage === null) {
          setStatus(null);
        } else {
          setStatus({ message: options.statusMessage });
        }
      } else {
        setStatus(null);
      }

      setToast(null);
      setFullScreenMessage({
        tone: "success",
        message,
        subtext:
          options?.statusMessage ??
          "Te llevaremos a la pantalla principal en un momento.",
      });

      setSearchTerm("");
      setSelectedStaffId(null);
      setShowSuggestions(false);

      scheduleWelcomeRedirect({
        name: options?.welcomeName ?? null,
        delay: options?.redirectDelayMs,
        reason: "checkin",
      });
    },
    [resolveSuccessMessage, scheduleWelcomeRedirect],
  );

  const performCheckInRequest = useCallback(
    async ({ staffId }: { staffId: number }) => {
      const response = await fetch("/api/staff/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ staffId }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          (payload as { error?: string })?.error ??
            "No se pudo registrar tu asistencia.",
        );
      }
    },
    [],
  );

  const queueStaffCheckIn = useCallback(({ staffId }: { staffId: number }) => {
    setPendingOfflineCheckIns((previous) => {
      const item: PendingStaffCheckIn = {
        id: generateQueueId(),
        createdAt: Date.now(),
        payload: { staffId },
      };
      const next = [...previous, item];
      writeQueue(STAFF_QUEUE_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const processQueuedCheckIns = useCallback(async () => {
    if (!isOnline || !pendingOfflineCheckIns.length || isSyncingOfflineQueue) {
      return;
    }

    setIsSyncingOfflineQueue(true);
    const entries = [...pendingOfflineCheckIns];
    let processedCount = 0;

    for (const entry of entries) {
      try {
        await performCheckInRequest(entry.payload);
        processedCount += 1;
        setPendingOfflineCheckIns((previous) => {
          const next = previous.filter((item) => item.id !== entry.id);
          writeQueue(STAFF_QUEUE_STORAGE_KEY, next);
          return next;
        });
      } catch (error) {
        if (isOfflineError(error)) {
          setIsOnline(false);
          break;
        }

        console.error(
          "No se pudo sincronizar un registro de personal pendiente",
          error,
        );
        setStatus({
          message:
            "No se pudo sincronizar un registro pendiente del personal. Intenta más tarde.",
        });
        break;
      }
    }

    if (processedCount > 0) {
      setToast({
        tone: "success",
        message:
          processedCount === 1
            ? "Tu registro pendiente del personal se envió automáticamente."
            : `${processedCount} registros pendientes del personal se sincronizaron.`,
      });
      setStatus(null);
      startTransition(() => {
        router.refresh();
      });
    }

    setIsSyncingOfflineQueue(false);
  }, [
    isOnline,
    isSyncingOfflineQueue,
    pendingOfflineCheckIns,
    performCheckInRequest,
    router,
    startTransition,
  ]);

  useEffect(() => {
    if (!isOnline || !pendingOfflineCheckIns.length || isSyncingOfflineQueue) {
      return;
    }

    void processQueuedCheckIns();
  }, [
    isOnline,
    isSyncingOfflineQueue,
    pendingOfflineCheckIns.length,
    processQueuedCheckIns,
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isFormDisabled) {
      setStatus({
        message:
          initialAlert ??
          "El registro no está disponible en este momento. Contacta a coordinación para registrar tu asistencia.",
      });
      return;
    }

    if (!selectedStaffId) {
      setStatus({
        message: "Selecciona a un miembro del personal antes de continuar.",
      });
      return;
    }

    setFullScreenMessage(null);

    if (!isOnline) {
      queueStaffCheckIn({ staffId: selectedStaffId });
      handlePostSubmitSuccess(selectedStaffId, {
        message: STAFF_OFFLINE_MESSAGE,
        statusMessage: STAFF_OFFLINE_MESSAGE,
        welcomeName: selectedStaffMember?.fullName ?? null,
        redirectDelayMs: 2200,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus(null);

      await performCheckInRequest({ staffId: selectedStaffId });

      handlePostSubmitSuccess(selectedStaffId, {
        statusMessage: null,
        welcomeName: selectedStaffMember?.fullName ?? null,
      });
    } catch (error) {
      console.error(error);

      if (isOfflineError(error)) {
        queueStaffCheckIn({ staffId: selectedStaffId });
        handlePostSubmitSuccess(selectedStaffId, {
          message: STAFF_OFFLINE_MESSAGE,
          statusMessage: STAFF_OFFLINE_MESSAGE,
          welcomeName: selectedStaffMember?.fullName ?? null,
          redirectDelayMs: 2200,
        });
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "No logramos registrar la asistencia. Inténtalo de nuevo.";
      setStatus({ message });
      setToast({ tone: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="registro-card relative flex flex-col gap-8 rounded-[48px] border-2 border-[#ffcaa1] bg-white px-10 py-12 shadow-[0_28px_64px_rgba(15,23,42,0.14)]"
      onSubmit={handleSubmit}
    >
      {toast ? (
        <EphemeralToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <div className="pointer-events-none absolute -top-8 left-12 hidden h-16 w-16 rotate-6 rounded-[26px] bg-[#ffe8d2]/70 blur-2xl md:block" />
      <div className="pointer-events-none absolute -bottom-10 right-20 hidden h-24 w-24 -rotate-6 rounded-[30px] bg-[#5fd5c8]/45 blur-2xl lg:block" />
      <header className="flex flex-col gap-1 text-left">
        <h1 className="text-3xl font-black text-brand-deep">Registro del personal</h1>
        <p className="max-w-lg text-xs text-brand-ink-muted md:text-sm">
          Busca tu nombre y marca que ya estás listo para recibir a los estudiantes.
        </p>
      </header>

      {initialAlert && (
        <div
          className="rounded-3xl border border-brand-orange bg-white/85 px-5 py-3 text-sm font-medium text-brand-ink"
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{initialAlert}</span>
            <button
              type="button"
              onClick={() => setInitialAlert(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-white/70 text-brand-ink hover:border-brand-orange/60 hover:text-brand-orange focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              aria-label="Ocultar mensaje inicial"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="rounded-3xl border border-brand-orange bg-white/80 px-5 py-3 text-sm font-medium text-brand-ink" role="status">
          Sin conexión a internet. Puedes seguir registrando y enviaremos los registros automáticamente cuando vuelva la conexión.
        </div>
      )}
      {isSyncingOfflineQueue && pendingOfflineCount > 0 && (
        <div className="rounded-3xl border border-brand-teal bg-white/85 px-5 py-3 text-sm font-medium text-brand-teal" role="status">
          Reconectamos y estamos enviando {pendingOfflineCount === 1 ? "1 registro pendiente" : `${pendingOfflineCount} registros pendientes`}…
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Nombre del personal
        </label>
        <div className="relative">
          <input
            id="staff-name"
            name="staff-name"
            autoComplete="off"
            placeholder="Busca tu nombre"
            value={searchTerm}
            onChange={(event) => {
              const value = event.target.value;
              setSearchTerm(value);

              const normalizedValue = value.trim().toLowerCase();
              const exactMatch = normalizedValue
                ? staffMembers.find(
                    (member) =>
                      member.fullName.trim().toLowerCase() === normalizedValue,
                  )
                : null;

              setSelectedStaffId(exactMatch ? exactMatch.id : null);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 120);
            }}
            className="w-full rounded-3xl border-2 border-[#ffe2c8] bg-[#fffaf5] px-6 py-4 text-base text-brand-ink shadow-inner focus:border-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFormDisabled}
          />
          {showSuggestions && filteredStaff.length > 0 && (
            <ul className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-3xl border border-white/60 bg-white/95 p-2 text-sm shadow-2xl">
              {filteredStaff.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearchTerm(member.fullName);
                      setSelectedStaffId(member.id);
                      setShowSuggestions(false);
                    }}
                    className={`flex w-full items-center justify-between gap-4 rounded-2xl px-3 py-2 text-left transition hover:bg-[#fff0e0] ${
                      member.id === selectedStaffId
                        ? "bg-[#ffe3c9] text-brand-deep"
                        : "text-brand-ink"
                    }`}
                  >
                    <span className="font-medium">{member.fullName}</span>
                    {member.role && (
                      <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
                        {member.role}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {status && (
        <div className="rounded-3xl border border-brand-orange bg-white/80 px-5 py-3 text-sm font-medium text-brand-ink">
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || isPending || isFormDisabled}
        className="cta-ripple inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-10 py-5 text-lg font-semibold uppercase tracking-wide text-white shadow-[0_22px_40px_rgba(255,122,35,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting || isPending ? "Registrando…" : "Confirmar ingreso"}
      </button>

      <button
        type="button"
        onClick={() => setShowHelp((previous) => !previous)}
        className="text-sm font-semibold text-brand-ink-muted underline-offset-4 hover:text-brand-teal hover:underline"
      >
        {showHelp ? "Ocultar pasos" : "¿Necesitas ayuda?"}
      </button>

      {showHelp && (
        <div className="rounded-[32px] bg-white/80 px-6 py-4 text-sm text-brand-ink-muted shadow-inner">
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wide text-brand-deep">
            Pasos rápidos
          </h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            <li>Busca tu nombre y selecciónalo.</li>
            <li>Revisa que no tengas una asistencia abierta.</li>
            <li>Presiona "Confirmar ingreso" para registrar tu llegada.</li>
            <li>Recuerda regresar para marcar tu salida al finalizar.</li>
          </ol>
        </div>
      )}

      <button type="submit" hidden aria-hidden />
      {fullScreenMessage ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(15,23,42,0.55)] px-6 py-6 backdrop-blur-sm">
          <div className="max-w-xl rounded-[36px] border border-white/80 bg-white/95 px-8 py-10 text-center text-brand-deep shadow-[0_28px_68px_rgba(15,23,42,0.28)]">
            <p className="text-2xl font-black leading-snug">{fullScreenMessage.message}</p>
            {fullScreenMessage.subtext ? (
              <p className="mt-3 text-sm font-medium text-brand-ink-muted">
                {fullScreenMessage.subtext}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
