"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveStaffAttendance } from "@/features/staff/data/queries";
import { FarewellOverlay } from "@/components/ui/farewell-overlay";
import { StaffAttendanceBoard } from "./staff-attendance-board";

type StaffAttendancePanelProps = {
  attendances: ActiveStaffAttendance[];
};

export function StaffAttendancePanel({
  attendances,
}: StaffAttendancePanelProps) {
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
          message="¡Excelente trabajo hoy!"
          subtitle="Gracias por tu dedicación"
          emoji="👏"
        />
      ) : null}
      <StaffAttendanceBoard
        attendances={attendances}
        onCheckoutComplete={handleCheckoutComplete}
      />
    </>
  );
}
