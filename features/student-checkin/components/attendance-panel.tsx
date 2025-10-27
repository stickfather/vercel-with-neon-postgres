"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveAttendance } from "@/features/student-checkin/data/queries";
import { FarewellOverlay } from "@/components/ui/farewell-overlay";
import { AttendanceBoard } from "./attendance-board";

type StudentAttendancePanelProps = {
  attendances: ActiveAttendance[];
};

export function StudentAttendancePanel({
  attendances,
}: StudentAttendancePanelProps) {
  const router = useRouter();
  const [showFarewell, setShowFarewell] = useState(false);
  const farewellTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (farewellTimeoutRef.current) {
        clearTimeout(farewellTimeoutRef.current);
      }
    };
  }, []);

  const handleCheckoutComplete = useCallback(() => {
    setShowFarewell(true);
    if (farewellTimeoutRef.current) {
      clearTimeout(farewellTimeoutRef.current);
    }
    farewellTimeoutRef.current = setTimeout(() => {
      router.push("/");
    }, 500);
  }, [router]);

  return (
    <>
      {showFarewell ? (
        <FarewellOverlay
          message="¡Buen trabajo en clase!"
          subtitle="Sigue así, nos vemos pronto"
          emoji="🌟"
        />
      ) : null}
      <AttendanceBoard
        attendances={attendances}
        onCheckoutComplete={handleCheckoutComplete}
      />
    </>
  );
}
