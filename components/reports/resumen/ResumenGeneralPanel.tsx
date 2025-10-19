import { getResumenGeneralData } from "src/features/reports/resumen/data";
import { LevelKpiMatrix } from "./LevelKpiMatrix";
import { ResumenHeaderTiles } from "./ResumenHeaderTiles";

export const revalidate = 300;

export default async function ResumenGeneralPanel() {
  const { header, kpis } = await getResumenGeneralData();

  return (
    <div className="flex flex-col gap-6">
      <ResumenHeaderTiles header={header} />
      <LevelKpiMatrix data={kpis} />
    </div>
  );
}
