# Learning Report Rewire Summary

This iteration focuses on stabilising and modernising the Learning management panel.

## Endpoints

- `/api/reports/learning`
  - Fully rewired to the `final.*` analytics layer through `buildLearningReport`.
  - Aggregates LEI trend, velocity, top/bottom learners, days-in-level, and stuck heatmap data.
  - Every database call is wrapped with safe fallbacks so a missing materialized view never fails a build.

- `/api/reportes/aprendizaje`
  - Deprecated with a `410 Gone` response to prevent legacy consumers from invoking removed `mgmt.*` views.

- `/api/reports/learning-90d/*` and `/api/reports/learning/stuck-students`
  - Removed to eliminate the old dependency chain that still referenced dropped `mgmt.*` objects.

## Data Sources

| KPI | View/MV |
| --- | --- |
| LEI trend + per-level velocity | `final.learning_lei_trend_weekly_mv` |
| Top 10% learners | `final.learning_lei_student_30d_mv` + `public.students` |
| Bottom 20% + inactivity | `final.learning_lei_student_30d_mv` + `final.engagement_inactivity_buckets_mv` |
| Days in level | `final.learning_days_in_level_mv` |
| Stuck lessons heatmap | `final.learning_stuck_lessons_heatmap_mv` |

Each loader logs a descriptive warning when a view is missing and returns empty structures so the frontend can render a fallback state.

## Frontend

- `/reports/aprendizaje` now consumes the unified `/api/reports/learning` response and renders:
  - A LEI trend chart with per-level toggles.
  - Top 10% exceptional learners and bottom 20% at-risk tables.
  - Median days-in-level chart and velocity cards per level.
  - A simplified stuck-student heatmap grid.
- The panel shows a fallback banner whenever any KPI is using placeholder data.

## Next Steps

- Wire drill-down interactions (e.g., stuck lesson click) to new runtime-only APIs backed by the `final.*` detail views.
- Add automated tests for the new data mappers once the analytics layer stabilises.
