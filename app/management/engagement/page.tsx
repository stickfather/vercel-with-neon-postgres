import { EngagementDashboard } from "@/components/management/engagement/EngagementDashboard";

export const revalidate = 30;

export default function EngagementManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto w-full max-w-7xl space-y-10 px-6 py-10 md:px-10 lg:px-14">
        <EngagementDashboard />
      </main>
    </div>
  );
}
