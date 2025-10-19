import { LearningDashboard } from "@/components/management/learning/LearningDashboard";
import { getLearningDashboardData } from "src/features/management/learning/data/learning.read";

export const revalidate = 60;

export default async function LearningManagementPage() {
  const data = await getLearningDashboardData();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto w-full max-w-7xl space-y-10 px-6 py-10 md:px-10 lg:px-14">
        <LearningDashboard data={data} />
      </main>
    </div>
  );
}
