# MD-Clean Engagement Panel - Visual Component Guide

This guide provides a visual description of each component in the Engagement Panel.

---

## Section A — Core Engagement KPIs (Snapshot)

### Module 1: Core Engagement Summary
**Component:** `CoreEngagementSummary.tsx`

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ ACTIVOS (7D)    │ ACTIVOS (14D)   │ ACTIVOS (30D)   │ ACTIVOS (6M)    │
│                 │                 │                 │                 │
│   1,234         │   1,856         │   2,543         │   3,456         │
│                 │                 │                 │                 │
│ Últimos 7 días  │ Últimos 14 días │ Últimos 30 días │ Base de retención│
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```
- **Layout:** 4 equal cards in a row
- **Style:** White background, slate borders, subtle shadow
- **Numbers:** Large, bold, thousands-separated

---

### Module 2: Inactivity Breakdown
**Component:** `InactivityBreakdown.tsx`

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ INACTIVOS 7+    │ INACTIVOS 14+   │ DORMIDOS 30+    │ INACTIVOS 180+  │
│ [amber]         │ [rose-500]      │ [rose-600]      │ [rose-700]      │
│   234           │   156           │   89            │   34            │
│                 │                 │                 │                 │
│ Sin asistencia  │ Sin asistencia  │ Sin asistencia  │ Sin asistencia  │
│ 7+ días         │ 14+ días        │ 30+ días        │ 180+ días       │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```
- **Color Progression:** Amber → Light Rose → Medium Rose → Dark Rose
- **Purpose:** Visual hierarchy shows severity of inactivity

---

### Module 3: WAU / MAU / WAU-MAU Ratio
**Component:** `WauMauRatioCards.tsx`

```
┌─────────────────┬─────────────────┬─────────────────┐
│ WAU (7D)        │ MAU (30D)       │ WAU/MAU         │
│                 │                 │ [color-coded]   │
│   1,234         │   2,543         │   48.5%         │
│                 │                 │                 │
│ Activos         │ Activos         │ Adherencia      │
│ semanales       │ mensuales       │ media           │
└─────────────────┴─────────────────┴─────────────────┘
```
- **Ratio Colors:**
  - Emerald: ≥60% (Alta adherencia)
  - Sky: 40-59% (Adherencia media)
  - Rose: <40% (Adherencia baja)

---

### Module 4: Promedio de Días Entre Visitas
**Component:** `AvgDaysBetweenVisitsCard.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Promedio de Días Entre Visitas                      │
│ Cálculo basado en brechas entre check-ins por alumno│
│                                                      │
│ Promedio                               4.2          │
│ Más alto = menor compromiso                         │
│ ───────────────────────────────────────────────     │
│ Mediana                                3.8          │
└─────────────────────────────────────────────────────┘
```
- **Layout:** Single wide card with stacked metrics
- **Shows:** Both mean and median for robust analysis

---

## Section B — Engagement Trends

### Module 5: Weekly Engagement Trend
**Component:** `WeeklyEngagementTrend.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Weekly Engagement Trend (12 semanas)                │
│ Pico de activos diarios y minutos totales por semana│
│                                                      │
│    Activos │                    ╱─────╲             │
│           │                  ╱─        ─╲           │
│           │              ╱───             ╲──       │
│           │          ╱───  [soft bars]       ───╲   │
│           └────────────────────────────────────────│
│             14 oct  21 oct  28 oct  4 nov  ...     │
│                                                      │
│  Legend: ─── Activos pico  ▬ Minutos totales       │
└─────────────────────────────────────────────────────┘
```
- **Line:** Max daily actives (left Y-axis, sky blue)
- **Bars:** Total minutes (right Y-axis, light gray, behind line)
- **X-axis:** Week start dates in ES format

---

### Module 6: Engagement Decline Index (WoW)
**Component:** `EngagementDeclineIndex.tsx`

```
┌──────────────────────────┬──────────────────────────┐
│ ALUMNOS ACTIVOS (7D)     │ MINUTOS (7D)             │
│                          │                          │
│   1,234  ▲ 5.2%         │   45,678  ▼ 2.1%        │
│   [emerald delta]        │   [rose delta]           │
│                          │                          │
│ vs 7d previos (prev: 1,173)│vs 7d previos (prev: 46,654)│
└──────────────────────────┴──────────────────────────┘
```
- **Delta Symbols:** ▲ (increase), ▼ (decrease), — (no change)
- **Delta Colors:** Emerald (positive), Rose (negative)
- **Shows:** Current vs previous 7-day period

---

### Module 7: Rolling 30-Day Active User Trend
**Component:** `MauRollingTrend.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Rolling 30-Day Active User Trend                    │
│ Activos 30d evaluados diariamente (últimos 90 días)│
│                                                      │
│  Activos│                                            │
│    30d  │        ╱────────────────╲                 │
│         │    ╱───                  ───╲             │
│         │╱───                          ───╲         │
│         └────────────────────────────────────────   │
│          1 ago    15 ago    1 sep    15 sep   ...  │
└─────────────────────────────────────────────────────┘
```
- **Line:** Emerald green, smooth curve
- **Shows:** Daily snapshot of 30-day active cohort size
- **Helps:** Identify growth or shrinkage trends

---

## Section C — Time Distribution & Behavior Patterns

### Module 8: Hour Split (08–12 / 12–17 / 17–20)
**Component:** `HourSplitBarsCard.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Hour Split 08–12 / 12–17 / 17–20                   │
│ Distribución de minutos por franja horaria          │
│                                                      │
│ Mañana (08–12)  ▬▬▬▬▬▬▬▬▬▬▬ 12,345 (28.5%)       │
│                                                      │
│ Tarde (12–17)   ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 23,456 (54.2%)  │
│                                                      │
│ Noche (17–20)   ▬▬▬▬▬▬ 7,654 (17.3%)              │
└─────────────────────────────────────────────────────┘
```
- **Bar Colors:** Yellow (morning), Blue (afternoon), Purple (evening)
- **Layout:** Horizontal bars
- **Shows:** Minutes and percentage of total

---

### Module 9: Tráfico por Hora — Heatmap
**Component:** `HourlyHeatmap.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Tráfico por Hora — Heatmap (últimos 90 días)       │
│ Demanda por día de semana y hora                    │
│                                                      │
│ Legend: □ 0  ▢ Bajo  ▢ Medio  ▣ Alto              │
│                                                      │
│      08  09  10  11  12  13  14  15  16  17  18  19  20│
│ Lun  ▢   ▢   ▣   ▣   ▣   ▣   ▣   ▣   ▢   ▢   □   □   □│
│ Mar  ▢   ▣   ▣   ▣   ▣   ▣   ▣   ▢   ▢   □   □   □   □│
│ Mié  ▣   ▣   ▣   ▣   ▣   ▣   ▣   ▣   ▢   ▢   □   □   □│
│ Jue  ▢   ▣   ▣   ▣   ▣   ▣   ▣   ▢   ▢   □   □   □   □│
│ Vie  ▢   ▢   ▣   ▣   ▣   ▣   ▢   ▢   ▢   □   □   □   □│
│ Sáb  □   □   ▢   ▢   ▢   ▢   ▢   □   □   □   □   □   □│
│ Dom  □   □   □   ▢   ▢   ▢   □   □   □   □   □   □   □│
└─────────────────────────────────────────────────────┘
```
- **Grid:** 7 rows (weekdays) × 13 columns (hours 8-20)
- **Colors:** Sky gradient (lighter = less traffic, darker = more traffic)
- **Hover:** Shows exact minutes for that day-hour combination
- **Purpose:** Identify peak demand periods for staffing

---

### Module 10: Día de la Semana con Mayor Tráfico
**Component:** `WeekdayTrafficBars.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Día de la Semana con Mayor Tráfico                 │
│ Distribución de minutos por día (últimos 90 días)  │
│                                                      │
│ Mié  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 45,678 (18.4%)          │
│ Jue  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 42,345 (17.1%)            │
│ Mar  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 39,234 (15.8%)              │
│ Lun  ▬▬▬▬▬▬▬▬▬▬▬▬▬ 37,123 (15.0%)               │
│ Vie  ▬▬▬▬▬▬▬▬▬▬▬▬ 35,456 (14.3%)                │
│ Sáb  ▬▬▬▬▬▬▬ 28,890 (11.7%)                      │
│ Dom  ▬▬▬▬▬ 19,567 (7.9%)                         │
└─────────────────────────────────────────────────────┘
```
- **Order:** Sorted high to low by minutes
- **Bar Colors:** Each weekday has unique color
- **Shows:** Minutes and percentage of total weekly traffic
- **Purpose:** Identify busiest days for resource planning

---

## Design Consistency

All components follow these design principles:

1. **Card Style:** `rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm`
2. **Hover Effect:** `hover:-translate-y-0.5 hover:shadow-md transition duration-200`
3. **Typography:**
   - Headers: `text-lg font-semibold text-slate-900`
   - Subtext: `text-xs text-slate-500`
   - Labels: `text-xs font-semibold uppercase tracking-[0.28em]`
4. **Numbers:** Large, bold, with thousands separators
5. **Charts:** Recharts with consistent colors and styling
6. **Spacing:** `gap-8` between sections, `gap-4` between cards

---

## Responsive Behavior

- **Desktop (lg+):** Most modules show full width with 2-4 columns
- **Tablet (md):** 2 columns where applicable
- **Mobile (sm):** Single column, cards stack vertically
- **Charts:** Adapt height and tick count based on screen size

---

## Accessibility

- Semantic HTML structure
- Proper ARIA labels on interactive elements
- Color contrast meets WCAG AA standards
- Hover tooltips provide additional context
- Keyboard navigation supported where applicable

---

**Visual Style:** Calm, analytical, professional (matching Exams/Learning panels)
