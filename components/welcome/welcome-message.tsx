"use client";

import { useEffect, useState } from "react";
import { getRecentAttendance } from "@/lib/dataClient";
import type { RecentAttendance } from "@/lib/db";

type WelcomeMessageProps = {
  searchParams: {
    saludo?: string;
    despedida?: string;
    nombre?: string;
  };
};

function decodeName(nombre?: string) {
  if (!nombre) return "";
  try {
    return decodeURIComponent(nombre);
  } catch (error) {
    return nombre;
  }
}

export function WelcomeMessage({ searchParams }: WelcomeMessageProps) {
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [isOnline] = useState(() => 
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    // If we have URL params, use those (from server)
    if (searchParams.saludo || searchParams.despedida) {
      return;
    }

    // Otherwise, check for recent offline activity
    const loadOfflineMessage = async () => {
      try {
        const recent = await getRecentAttendance(1);
        if (recent.length > 0 && !isOnline) {
          const lastEvent = recent[0];
          const timeAgo = Math.floor((Date.now() - lastEvent.ts) / 1000);
          
          if (timeAgo < 300) { // Within last 5 minutes
            if (lastEvent.type === "check-in") {
              setOfflineMessage("¡Bienvenido/a! Tu registro se guardó localmente y se sincronizará cuando haya conexión.");
            } else if (lastEvent.type === "check-out") {
              setOfflineMessage("¡Hasta pronto! Tu salida se guardó localmente y se sincronizará cuando haya conexión.");
            }
          }
        }
      } catch (error) {
        console.error("Failed to load offline message", error);
      }
    };

    if (!isOnline) {
      loadOfflineMessage();
    }
  }, [searchParams, isOnline]);

  const safeName = decodeName(searchParams.nombre);
  
  if (searchParams.saludo) {
    return (
      <div className="w-full max-w-3xl rounded-3xl border border-brand-teal bg-white/80 px-6 py-4 text-center text-lg font-semibold shadow-md">
        ¡Bienvenido/a, {safeName || "estudiante"}! Tu registro quedó confirmado.
      </div>
    );
  }

  if (searchParams.despedida) {
    return (
      <div className="w-full max-w-3xl rounded-3xl border border-brand-orange bg-white/70 px-6 py-4 text-center text-lg font-semibold shadow-md">
        ¡Hasta pronto, {safeName || "estudiante"}! Buen trabajo en clase.
      </div>
    );
  }

  if (offlineMessage) {
    return (
      <div className="w-full max-w-3xl rounded-3xl border border-brand-teal bg-white/80 px-6 py-4 text-center text-lg font-semibold shadow-md">
        {offlineMessage}
      </div>
    );
  }

  return null;
}
