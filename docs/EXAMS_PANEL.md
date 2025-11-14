# Exámenes y Instructivos Panel - Management Reports

> **Nota histórica:** Este documento recopila la especificación original del panel de exámenes. Desde la migración a
> **Exámenes y Instructivos**, la ruta oficial es `/reports/examenes-y-instructivos` y el origen de datos proviene de las vistas
> `final.*` detalladas abajo.

## Overview

The **Exams Panel** provides comprehensive insights into exam results, pass rates, score distributions, and student performance tracking over rolling time windows. This panel implements 17 distinct modules following zero-ambiguity specifications.

## Access

- **URL**: `/reports/examenes-y-instructivos`
- **Route**: `app/reports/examenes-y-instructivos/page.tsx`
- **Stack**: React 19, Next.js 15, Tailwind CSS 4, Recharts 2.x

## Architecture

### Data Layer

**Location**: `src/features/reports/examenes-instructivos/report.ts`

All data queries follow a strict window-based approach:
- **90-day window**: Most KPIs and charts
- **180-day window**: Struggling students analysis
- **30-day window**: Upcoming exams

#### Final Analytics Views (source of truth)

| Métrica | Vista `final.*` | Columnas clave |
| --- | --- | --- |
| Tasa de aprobación / Puntaje promedio / Primer intento (90d) | `final.exams_90d_summary_mv` | `pass_rate_pct`, `avg_score`, `first_attempt_pass_rate_pct` |
| Tendencia semanal y volumen (90d) | `final.exams_weekly_trend_90d_mv` | `week_start`, `pass_count`, `fail_count`, `exams_count`, `avg_score`, `pass_rate_pct` |
| Distribución de puntajes (90d) | `final.exams_score_distribution_90d_mv` | `bin_label`, `count` |
| Mapa Nivel × Tipo (90d) | `final.exams_level_type_heatmap_mv` | `level`, `exam_type`, `avg_score`, `exams_count`, `pass_rate_pct` |
| Repitencias (90d) | `final.exams_repeat_summary_90d_mv` | `student_name`, `level`, `exam_type`, `retake_count`, `days_to_retake_avg`, `score_delta` |
| Estudiantes en riesgo (180d) | `final.exams_students_attention_180d_mv` | `student_name`, `fails_90d`, `pending_instructivos`, `overdue_instructivos`, `last_exam_date` |
| Próximos exámenes (30d) | `final.exams_upcoming_30d_mv` | `scheduled_at`, `scheduled_local`, `student_name`, `level`, `exam_type`, `status` |
| Resumen de instructivos (90d) | `final.instructivos_90d_summary_mv` | `assigned_90d`, `completion_rate_pct`, `median_completion_days` |
| Histograma instructivos (90d) | `final.student_instructivos_enriched_v` | `completion_days` |
| Estado instructivos | `final.instructivos_status_mv` | `student_name`, `status_label`, `assigned_at`, `due_date`, `days_overdue` |

Cada consulta del endpoint `/api/reports/examenes-y-instructivos` lee estas vistas en paralelo y, si alguna falta, entrega datos vacíos + `fallback: true`.

### API Endpoints

1. **Main Data Endpoint**: `/api/reports/examenes-y-instructivos`
   - Devuelve todos los KPIs consolidados en un único payload estructurado
   - Incluye: resumen de exámenes, instructivos, tendencias, distribuciones, tablas y agenda de exámenes
   - Cache: 5 minutos (300s)

2. **Drill-Down Endpoint**: _pendiente de reimplementación_
   - El drawer legacy se eliminó durante el Module 0; cualquier nueva interacción deberá apuntar a las vistas `final.*`

### Type Definitions

**Location**: `types/exams.ts`

Comprehensive TypeScript types for all data structures including:
- KPI types (pass rates, scores, compliance)
- Chart data types (weekly, distribution, heatmap)
- Table data types (retakes, struggling students)
- Drill-down query types

## UI Components

**Location**: `components/reports/exams/`

### Module Breakdown

#### Module 1: Panel Initialization
- **Component**: `ExamsPanelClient.tsx`
- Main orchestrator component
- Manages global state for drawer
- Handles keyboard events (Esc)
- Implements loading and error states

#### Modules 2-5: KPI Cards
1. **PassRateCard** - 90-day pass rate with color-coded thresholds
   - Green (≥70%), Amber (50-69%), Rose (<50%)
2. **AverageScoreCard** - Average score with meter bar
3. **FirstAttemptPassCard** - First-attempt pass rate
4. **InstructiveComplianceCard** - Assigned and completed percentages

#### Module 6: Weekly Trend Chart
- **Component**: `WeeklyTrendChart.tsx`
- Recharts `ComposedChart` with stacked bars and line
- Stacked bars: Passed (emerald) + Failed (rose)
- Line overlay: Pass rate percentage
- Click interaction opens drill-down drawer

#### Module 7: Score Distribution Histogram
- **Component**: `ScoreDistributionChart.tsx`
- Recharts `BarChart` with 20 bins (0-5, 5-10, ..., 95-100)
- Median reference line overlay
- Sky blue bars with rounded tops

#### Module 8: Level × Exam Type Heatmap
- **Component**: `LevelExamTypeHeatmap.tsx`
- CSS Grid heatmap (not Recharts)
- Color scale: Rose (<50) → Emerald (90+)
- Shows avg score, count, pass %
- Click cells to drill down

#### Module 9: Weekly Volume Chart
- **Component**: `WeeklyVolumeChart.tsx`
- Recharts `LineChart` showing completed count
- Single line with circle markers

#### Module 10: Retakes Table
- **Component**: `RetakesTable.tsx`
- Shows first fail and retake details
- Left border accent: Green if Δscore ≥10, Rose if negative
- Date formatting in `dd MMM` format

#### Module 11: Struggling Students Table
- **Component**: `StrugglingStudentsTable.tsx`
- Top 20 at-risk students (180-day window)
- Severity chips: Rose (consecutive fails), Amber (multiple), Slate (low scores), Sky (unresolved)
- Sorted by risk factors

#### Module 12: Upcoming Exams Agenda
- **Component**: `UpcomingExamsAgenda.tsx`
- Grouped by date with sticky headers
- Shows time (HH:mm), student, type, level, status
- Days-until indicator

#### Module 13: Drill-Down Drawer
- **Component**: `DrillDownDrawer.tsx`
- Slides in from right (520px width)
- Paginated table (25 rows/page)
- Closes with Esc or backdrop click
- Shows detailed exam results

#### Modules 14-16: Global Features
- Tailwind CSS with 8pt grid system
- Rounded-2xl cards with soft shadows
- Typography: Inter/SF Pro with semantic sizes
- Loading skeletons (no shimmer >1.2s)
- Inline error alerts with retry button
- All dates in America/Guayaquil timezone

#### Module 17: Acceptance Tests
See checklist below.

## Data Flow

```mermaid
graph TD
    A[Page Load] --> B[/api/reports/exams]
    B --> C[Parallel Data Fetch]
    C --> D1[Pass Rate 90d]
    C --> D2[Average Score 90d]
    C --> D3[First Attempt Data]
    C --> D4[Instructive Compliance]
    C --> D5[Weekly KPIs]
    C --> D6[Score Distribution]
    C --> D7[Completed Exams]
    C --> D8[Retakes]
    C --> D9[Struggling Students]
    C --> D10[Upcoming Exams]
    
    D3 --> E[Compute First-Attempt Rate]
    D1 --> F[Render KPI Cards]
    D2 --> F
    E --> F
    D4 --> F
    
    D5 --> G[Render Charts]
    D6 --> G
    D7 --> G
    
    D8 --> H[Render Tables]
    D9 --> H
    
    D10 --> I[Render Agenda]
    
    G --> J{User Clicks Chart}
    J --> K[/api/reports/exams/drilldown]
    K --> L[Open Drawer]
```

## Timezone Handling

All timestamp displays use **America/Guayaquil** timezone:
- Dates formatted as `dd MMM` (e.g., "12 Nov")
- Times formatted as `HH:mm` (24-hour)
- Uses `date-fns` library for formatting

## Accessibility

- All charts wrapped in `<figure>` with descriptive `<figcaption>`
- Keyboard navigation support:
  - **Esc**: Close drill-down drawer
  - **Enter**: Drill into chart data (on focusable elements)
- ARIA labels on all interactive elements
- Tooltip content includes all numeric values
- Semantic HTML throughout

## Acceptance Tests Checklist

Per Module 17, these criteria must pass:

1. ✅ No filters visible anywhere in panel
2. ⏳ KPI Pass Rate (90d) equals `mgmt.exam_overall_pass_rate_90d_v`
3. ⏳ KPI Average Score (90d) equals `mgmt.exam_average_score_90d_v`
4. ⏳ First-Attempt Pass (90d) matches FE grouping logic
5. ⏳ Weekly trend bar totals equal drawer rows for that week
6. ⏳ Histogram totals equal number of scored exams in 90d
7. ⏳ Heatmap values match grouped averages
8. ⏳ Retakes table shows only rows with `first_fail_at >= now()-90d`
9. ✅ Students at Risk table "last 180 days" label present
10. ⏳ Upcoming counter equals agenda item count
11. ✅ All dates/times displayed in America/Guayaquil
12. ✅ Keyboard navigation & ARIA labeling work
13. ⏳ All charts render within 300ms on typical data sets

**Legend**: ✅ Verified in code | ⏳ Requires database testing

## Development

### Local Testing

To test this panel locally:

1. Ensure your `.env` file has `DATABASE_URL` pointing to your Neon database
2. Ensure all required `mgmt.exam_*` views exist
3. Run `npm run dev`
4. Navigate to `http://localhost:3000/reports/examenes-y-instructivos`

### Adding New Modules

To extend the panel:

1. Add types to `types/exams.ts`
2. Add query functions to `src/features/reports/exams/data.ts`
3. Update API endpoint `app/api/reports/exams/route.ts`
4. Create component in `components/reports/exams/`
5. Add to `ExamsPanelClient.tsx`

## Performance

- Initial data load: Single API call fetches everything
- Drill-downs: Separate cached API calls (180s TTL)
- Client-side computation: Heatmap aggregations
- Pagination: 25 items per drawer page
- No redundant queries due to cancellation on unmount

## Browser Support

- Modern browsers with ES2020+ support
- Recharts requires SVG support
- Grid layout requires CSS Grid support

## Dependencies

- `recharts` (^2.x) - Charting library
- `date-fns` (^3.x) - Date formatting and manipulation
- `next` (15.5.3) - React framework
- `react` (19.1.0) - UI library
- `tailwindcss` (^4) - Styling

## Known Limitations

1. Requires all database views to be present or falls back to computed values
2. No real-time updates (5-minute cache)
3. Drill-down pagination is client-side only
4. Heatmap limited to predefined levels (A1-C1)
5. Score distribution assumes 5-point bins

## Future Enhancements

- [ ] Add filter controls (despite spec saying no filters)
- [ ] Export to CSV/PDF
- [ ] Historical trend comparison
- [ ] Student detail page integration
- [ ] Email alerts for at-risk students
- [ ] Custom date range selection
