import ErrorState from "../../ErrorState";
import {
  peakLoadWindows,
  staffByHour30d,
  studentStaffRatioByHour30d,
  studentsByHour30d,
  type PeakLoadWindowRow,
  type StaffByHourRow,
  type StudentStaffRatioRow,
  type StudentsByHourRow,
} from "../../data/ops.read";
import OpsContent from "./OpsContent.client";

export default async function OpsPanel() {
  try {
    const [students, staff, ratios, peaks] = (await Promise.all([
      studentsByHour30d(),
      staffByHour30d(),
      studentStaffRatioByHour30d(),
      peakLoadWindows(),
    ])) as [
      StudentsByHourRow[],
      StaffByHourRow[],
      StudentStaffRatioRow[],
      PeakLoadWindowRow[],
    ];

    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Operaciones &amp; personal</h2>
          <p className="text-sm text-brand-ink-muted">Cargas por hora, dotación y ratio alumno/coach.</p>
        </header>

        <OpsContent students={students} staff={staff} ratios={ratios} peaks={peaks} />
      </div>
    );
  } catch (error) {
    console.error("Error al cargar operaciones y personal", error);
    return <ErrorState retryHref="/panel-gerencial/ops" />;
  }
}
