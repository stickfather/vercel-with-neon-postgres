"use client";

import { useEffect, useState } from "react";
import { getFailedEvents, type PendingEvent } from "@/lib/offline/indexeddb";

export function FailedEventsBadge() {
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      try {
        const failed = await getFailedEvents();
        setFailedCount(failed.length);
      } catch (error) {
        console.error("Failed to get failed events count", error);
      }
    };

    updateCount();
    
    // Update every 10 seconds
    const interval = setInterval(updateCount, 10000);

    return () => clearInterval(interval);
  }, []);

  if (failedCount === 0) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#ff9800]/30 bg-[#fff4ec] px-3 py-1 text-xs font-semibold text-[#e65100]">
      <span>⚠️</span>
      <span>
        {failedCount} {failedCount === 1 ? "evento" : "eventos"} requiere
        {failedCount === 1 ? "" : "n"} revisión
      </span>
    </div>
  );
}
