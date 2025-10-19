import { LearningDashboard } from "@/components/management/learning/LearningDashboard";
import { getLearningDashboardData } from "src/features/management/learning/data/learning.read";

import ErrorState from "../../ErrorState";

export default async function ProgressPanel() {
  try {
    const data = await getLearningDashboardData();

    return (
      <LearningDashboard data={data} />
    );
  } catch (error) {
    console.error("Error al cargar progreso y aprendizaje", error);
    return <ErrorState retryHref="/panel-gerencial/progress" />;
  }
}
