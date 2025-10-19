import { LearningDashboard } from "@/components/management/learning/LearningDashboard";
import { getLearningDashboardData } from "src/features/management/learning/data/learning.read";

import ErrorState from "../../ErrorState";

const TREND_WINDOWS = [13, 26, 52] as const;
type TrendWindow = (typeof TREND_WINDOWS)[number];

type ProgressProps = {
  selectedLevel?: string | null;
  selectedLevels?: string[];
  initialTrendWindow?: TrendWindow;
};

const DEFAULT_TREND_WINDOW: TrendWindow = 26;

export default async function ProgressPanel({
  selectedLevel,
  selectedLevels = [],
  initialTrendWindow = DEFAULT_TREND_WINDOW,
}: ProgressProps) {
  try {
    const requestedLevels = selectedLevels.length
      ? selectedLevels
      : selectedLevel
      ? [selectedLevel]
      : [];

    const data = await getLearningDashboardData(requestedLevels);
    const normalizedLevels = requestedLevels.filter((level) =>
      data.availableLevels.includes(level),
    );

    return (
      <LearningDashboard
        data={data}
        initialLevels={normalizedLevels}
        initialTrendWindow={initialTrendWindow}
      />
    );
  } catch (error) {
    console.error("Error al cargar progreso y aprendizaje", error);
    return <ErrorState retryHref="/panel-gerencial/progress" />;
  }
}
