import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PersonnelStudentLoad } from "@/types/personnel";

type LoadRatioBarsProps = {
  data: PersonnelStudentLoad[];
};

function formatHour(hour: number): string {
  return String(hour).padStart(2, "0");
}

function getBarColor(ratio: number, staff: number): string {
  if (staff === 0) return "#94a3b8"; // gray for no coverage
  if (ratio <= 2.0) return "#10b981"; // green
  if (ratio <= 3.0) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

export function LoadRatioBars({ data }: LoadRatioBarsProps) {
  const chartData = data.map((d) => ({
    hour: d.hour_of_day,
    hourLabel: formatHour(d.hour_of_day),
    ratio: d.estudiantes_por_profesor,
    students: d.minutos_estudiantes,
    staff: d.minutos_personal,
    fill: getBarColor(d.estudiantes_por_profesor, d.minutos_personal),
  }));

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <figcaption className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-slate-900 md:text-lg">
          Student Load per Teacher
        </h2>
        <p className="text-sm text-slate-600">
          Hourly teacher burden with 2.0× target reference line
        </p>
      </figcaption>

      <div className="h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            
            <XAxis
              dataKey="hourLabel"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{
                value: "Load Ratio",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12, fill: "#64748b" },
              }}
            />
            
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0].payload;
                
                if (d.staff === 0) {
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                      <p className="mb-2 text-sm font-semibold text-slate-900">
                        {d.hourLabel}:00
                      </p>
                      <p className="text-xs font-semibold text-rose-600">
                        No staff coverage
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="mb-2 text-sm font-semibold text-slate-900">
                      {d.hourLabel}:00
                    </p>
                    <div className="space-y-1 text-xs">
                      <p className="flex items-center gap-2">
                        <span className="text-slate-600">Students:</span>
                        <span className="font-semibold text-slate-900">
                          {d.students.toLocaleString("en-US")} min
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-slate-600">Staff:</span>
                        <span className="font-semibold text-slate-900">
                          {d.staff.toLocaleString("en-US")} min
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-slate-600">Load:</span>
                        <span className="font-semibold text-slate-900">
                          {d.ratio.toFixed(2)}×
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            
            <ReferenceLine
              y={2.0}
              stroke="#10b981"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Target: 2.0×",
                position: "right",
                fill: "#10b981",
                fontSize: 11,
              }}
            />
            
            <Bar dataKey="ratio" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-500" />
          <span className="text-slate-600">≤2.0× (Good)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-amber-500" />
          <span className="text-slate-600">2.01–3.0× (Tight)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-rose-500" />
          <span className="text-slate-600">&gt;3.0× (High Risk)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-slate-400" />
          <span className="text-slate-600">No Coverage</span>
        </div>
      </div>
    </figure>
  );
}
