"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "salcPins";

type StoredPins = {
  staff_pin: string;
  manager_pin: string;
  version: number;
  last_synced_at: string;
};

type LocalPinContextValue = {
  pins: StoredPins | null;
  refreshPins: () => Promise<void>;
};

const LocalPinContext = createContext<LocalPinContextValue | null>(null);

let requestPinHandler: ((role: "staff" | "manager") => Promise<boolean>) | null = null;

export async function requirePin(requiredRole: "staff" | "manager"): Promise<boolean> {
  if (!requestPinHandler) {
    console.warn("El proveedor de PIN local no está disponible en este momento.");
    return false;
  }
  return requestPinHandler(requiredRole);
}

function loadStoredPins(): StoredPins | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPins;
    if (
      typeof parsed?.staff_pin === "string" &&
      typeof parsed?.manager_pin === "string" &&
      typeof parsed?.version === "number"
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn("No se pudo leer el PIN almacenado localmente", error);
  }
  return null;
}

function persistPins(pins: StoredPins | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!pins) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch (error) {
    console.warn("No se pudo guardar el PIN localmente", error);
  }
}

type ModalState = {
  role: "staff" | "manager";
  resolve: (value: boolean) => void;
};

const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

type ProviderProps = {
  children: React.ReactNode;
};

export function LocalPinProvider({ children }: ProviderProps) {
  const [pins, setPins] = useState<StoredPins | null>(() => loadStoredPins());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    requestPinHandler = (role) =>
      new Promise<boolean>((resolve) => {
        setModal({ role, resolve });
        setEnteredPin("");
        setErrorMessage(null);
      });
    return () => {
      requestPinHandler = null;
    };
  }, []);

  const refreshPins = async () => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;
    const controller = new AbortController();
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/pins/get-latest", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as {
        staff_pin?: string;
        manager_pin?: string;
        version?: number | string;
      };
      const staffPin = typeof payload?.staff_pin === "string" ? payload.staff_pin.trim() : "";
      const managerPin = typeof payload?.manager_pin === "string" ? payload.manager_pin.trim() : "";
      const versionValue = Number(payload?.version ?? 0);
      if (!/^\d{4}$/.test(staffPin) || !/^\d{4}$/.test(managerPin)) {
        return;
      }
      if (!Number.isFinite(versionValue)) {
        return;
      }
      const nextPins: StoredPins = {
        staff_pin: staffPin,
        manager_pin: managerPin,
        version: versionValue,
        last_synced_at: new Date().toISOString(),
      };
      setPins((previous) => {
        if (!previous || previous.version !== nextPins.version) {
          persistPins(nextPins);
          return nextPins;
        }
        return previous;
      });
    } catch (error) {
      console.warn("No se pudo actualizar los PIN locales", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (navigator.onLine) {
      void refreshPins();
    }
    const handleOnline = () => {
      void refreshPins();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const closeModal = (result: boolean) => {
    if (modal) {
      modal.resolve(result);
    }
    setModal(null);
    setEnteredPin("");
    setErrorMessage(null);
  };

  const validatePin = (candidate: string): boolean => {
    if (!pins) {
      setErrorMessage("Sin PIN sincronizado. Conéctate a Internet para actualizar.");
      return false;
    }
    if (!/^\d{4}$/.test(candidate)) {
      setErrorMessage("PIN incorrecto");
      return false;
    }
    if (modal?.role === "manager") {
      if (candidate === pins.manager_pin) {
        return true;
      }
      setErrorMessage("PIN incorrecto");
      return false;
    }
    if (candidate === pins.staff_pin || candidate === pins.manager_pin) {
      return true;
    }
    setErrorMessage("PIN incorrecto");
    return false;
  };

  const handleDigit = (digit: string) => {
    setEnteredPin((current) => {
      if (current.length >= 4) return current;
      const next = `${current}${digit}`;
      setErrorMessage(null);
      return next;
    });
  };

  const handleBackspace = () => {
    setEnteredPin((current) => current.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setEnteredPin("");
    setErrorMessage(null);
  };

  const handleAccept = () => {
    const normalized = enteredPin.trim();
    if (normalized.length !== 4) {
      setErrorMessage("Ingresa los 4 dígitos del PIN");
      return;
    }
    if (validatePin(normalized)) {
      closeModal(true);
    }
  };

  const contextValue = useMemo<LocalPinContextValue>(
    () => ({ pins, refreshPins }),
    [pins],
  );

  return (
    <LocalPinContext.Provider value={contextValue}>
      {children}
      {modal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,23,42,0.55)] px-4 py-6">
          <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/95 p-6 text-center text-brand-deep shadow-[0_28px_64px_rgba(15,23,42,0.2)]">
            <div className="mb-4 flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Ingresa tu PIN</h2>
              <p className="text-sm text-brand-ink-muted">
                {modal.role === "manager"
                  ? "Solo gerencia puede acceder a esta sección."
                  : "Confirma que eres parte del equipo autorizado."}
              </p>
            </div>
            <div className="mb-3 flex items-center justify-center gap-2">
              {[0, 1, 2, 3].map((index) => {
                const filled = index < enteredPin.length;
                return (
                  <span
                    // eslint-disable-next-line react/no-array-index-key
                    key={`pin-slot-${index}`}
                    className={`h-4 w-4 rounded-full border-2 ${
                      filled ? "border-brand-teal bg-brand-teal" : "border-brand-ink-muted/40 bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              value={enteredPin}
              onChange={(event) => {
                const sanitized = event.target.value.replace(/[^\d]/g, "").slice(0, 4);
                setEnteredPin(sanitized);
                setErrorMessage(null);
              }}
              className="sr-only"
              aria-hidden
            />
            <div className="grid grid-cols-3 gap-3 py-4">
              {keypadDigits.map((digit) => (
                <button
                  type="button"
                  key={digit}
                  onClick={() => handleDigit(digit)}
                  className="h-12 rounded-2xl border border-brand-ink-muted/20 bg-white text-lg font-semibold text-brand-deep shadow-inner transition active:scale-[0.97]"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-2xl border border-brand-ink-muted/20 bg-white text-base font-semibold text-brand-deep shadow-inner transition active:scale-[0.97]"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="h-12 rounded-2xl border border-brand-ink-muted/20 bg-white text-sm font-semibold uppercase text-brand-deep shadow-inner transition active:scale-[0.97]"
              >
                Limpiar
              </button>
              <div className="h-12" aria-hidden="true" />
            </div>
            {errorMessage ? (
              <p className="mb-4 text-sm font-semibold text-brand-orange">{errorMessage}</p>
            ) : null}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => closeModal(false)}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-transparent bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={enteredPin.length < 4}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-transparent bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] disabled:opacity-60"
              >
                Aceptar
              </button>
            </div>
            {isRefreshing ? (
              <p className="mt-4 text-xs text-brand-ink-muted">
                Sincronizando PIN…
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </LocalPinContext.Provider>
  );
}

export function useLocalPins(): LocalPinContextValue {
  const context = useContext(LocalPinContext);
  if (!context) {
    throw new Error("useLocalPins debe usarse dentro de LocalPinProvider");
  }
  return context;
}
