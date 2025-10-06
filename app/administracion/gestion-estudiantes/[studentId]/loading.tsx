import {
  BasicDetailsPanelSkeleton,
} from "@/features/administration/components/student-profile/basic-details-panel";
import {
  PaymentSchedulePanelSkeleton,
} from "@/features/administration/components/student-profile/payment-schedule-panel";
import { NotesPanelSkeleton } from "@/features/administration/components/student-profile/notes-panel";
import { ExamsPanelSkeleton } from "@/features/administration/components/student-profile/exams-panel";
import { CoachPanelSkeleton } from "@/features/administration/components/student-profile/coach-panel";

export default function Loading() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-64 w-64 -rotate-[16deg] rounded-[42px] bg-[#ffe6d2] opacity-80" />
        <div className="absolute right-0 top-10 h-56 w-56 rotate-[12deg] rounded-[38px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[480px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex animate-pulse flex-col gap-4 rounded-[32px] border border-white/70 bg-white/92 px-7 py-8 text-left shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
          <span className="h-6 w-32 rounded-full bg-brand-deep-soft/60" />
          <div className="flex flex-col gap-3 text-brand-deep">
            <span className="h-8 w-64 rounded-full bg-brand-deep-soft/80" />
            <span className="h-4 w-80 max-w-full rounded-full bg-brand-deep-soft/50" />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <span className="h-8 w-48 rounded-full bg-white/80" />
            <span className="h-8 w-48 rounded-full bg-white/80" />
          </div>
        </header>

        <div className="flex flex-col gap-8 pb-10">
          <BasicDetailsPanelSkeleton />
          <PaymentSchedulePanelSkeleton />
          <NotesPanelSkeleton />
          <ExamsPanelSkeleton />
          <CoachPanelSkeleton />
        </div>
      </main>
    </div>
  );
}
