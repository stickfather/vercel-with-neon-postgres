import { getResumenGeneralData } from "src/features/reports/resumen/data";
import { LevelKpiMatrix } from "./LevelKpiMatrix";
import { ProgressByLevelStacked } from "./ProgressByLevelStacked";
import { ResumenHeaderTiles } from "./ResumenHeaderTiles";
import { LevelStateStacked } from "./LevelStateStacked";

export const revalidate = 300;

export default async function ResumenGeneralPanel() {
  const { header, bands, kpis } = await getResumenGeneralData();

  return (
    <div className="flex flex-col gap-6">
      <ResumenHeaderTiles header={header} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ProgressByLevelStacked data={bands} />
        <LevelStateStacked data={kpis} />
      </div>
      <LevelKpiMatrix data={kpis} />
    </div>
  );
}
