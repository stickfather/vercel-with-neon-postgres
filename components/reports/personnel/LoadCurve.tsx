import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PersonnelCoverageByHour } from "@/types/personnel";

type LoadCurveProps = {
  data: PersonnelCoverageByHour[];
};

function formatHour(hour: number): string {
  return String(hour).padStart(2, "0");
}

export function LoadCurve({ data }: LoadCurveProps) {
  // Transform data for Recharts
  const chartData = data.map((d) => ({
    hour: d.hour_of_day,
    hourLabel: formatHour(d.hour_of_day),
    students: d.minutos_estudiantes,
    staff: d.minutos_personal,
    ratio: d.carga_relativa,
  }));

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <figcaption className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-slate-900 md:text-lg">
          Curva de Carga del Personal
        </h2>
        <p className="text-sm text-slate-600">
          Demanda de estudiantes vs oferta de personal a lo largo del día (08:00–20:00)
        </p>
      </figcaption>

      <div className="h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="studentsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="staffGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            
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
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="mb-2 text-sm font-semibold text-slate-900">
                      {data.hourLabel}:00
                    </p>
                    <div className="space-y-1 text-xs">
                      <p className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        <span className="text-slate-600">Estudiantes:</span>
                        <span className="font-semibold text-slate-900">
                          {data.students.toLocaleString("es-EC")} min
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-400" />
                        <span className="text-slate-600">Personal:</span>
                        <span className="font-semibold text-slate-900">
                          {data.staff.toLocaleString("es-EC")} min
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-slate-600">Ratio:</span>
                        <span className="font-semibold text-slate-900">
                          {data.ratio.toFixed(2)}×
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            
            <Area
              type="monotone"
              dataKey="students"
              stroke="#f87171"
              strokeWidth={2}
              fill="url(#studentsGradient)"
              name="Estudiantes"
            />
            
            <Line
              type="monotone"
              dataKey="staff"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              name="Personal"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="text-slate-600">Student Minutes</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-400" />
          <span className="text-slate-600">Staff Minutes</span>
        </div>
      </div>
    </figure>
  );
}
