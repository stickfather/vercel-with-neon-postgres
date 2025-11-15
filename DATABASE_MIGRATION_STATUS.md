# Database Schema Migration Status

## ✅ Completed

### Removed Deprecated Fields
- **`has_special_needs`** - Removed all fallback references
  - Now using only `is_under_management_supervision` field
  - Updated in: `features/administration/data/students.ts` and `features/administration/data/student-profile.ts`

### Removed Deprecated Views
- **`mgmt.last_refresh_v`** - Completely removed
  - Deleted query from `app/administracion/gestion-estudiantes/page.tsx`
  - Deleted `/api/last-refresh` API endpoint
  - Management page now shows no refresh timestamp

## ⚠️ Remaining Deprecated View References

The following views are still referenced in `features/administration/data/student-profile.ts`. These provide aggregated metrics for the coach panel and lesson journey features:

### 1. `mart.coach_panel_v`
**Current Usage (3 locations):**
- `getStudentCoachPanelProfileHeader()` - Line ~1502
- `listStudentLessonJourneyLessons()` - Line ~1782

**Purpose:**
Provides aggregated student metrics including:
- Plan level min/max
- Plan progress percentage
- Completed lessons count
- Total lessons in plan
- LEI (Learning Efficiency Index) metrics
- Engagement statistics (days active, minutes, avg session length)

**Impact if missing:**
- Coach panel header will show nulls for progress metrics
- Student profile won't display learning velocity/pace data

### 2. `mart.student_plan_lessons_with_status_v`
**Current Usage (5 locations):**
- `listStudentLessonJourneyLessons()` - Line ~1754
- `resolveLessonIdForCoachPanel()` - Lines ~2451, ~2472

**Purpose:**
Provides student lesson journey with completion status:
- All lessons in student's plan
- Lesson completion flags
- Lesson sequencing (global and level-specific)
- Level codes and lesson metadata

**Impact if missing:**
- Lesson journey visualization won't display
- Can't track student progress through curriculum
- Coach panel lesson navigation limited

## 🔧 Solutions

### Option 1: Recreate Views (Recommended)
Create the views in the database to match the expected schema:

```sql
-- mart.coach_panel_v
CREATE OR REPLACE VIEW mart.coach_panel_v AS
SELECT 
  s.id AS student_id,
  s.full_name,
  s.photo_url AS profile_image_url,
  s.planned_level_min AS level_min,
  s.planned_level_max AS level_max,
  scl.level AS current_level,
  -- Add aggregated metrics here
  0 AS progress_pct_plan,
  0 AS completed_lessons_in_plan,
  0 AS total_lessons_in_plan,
  0 AS total_minutes_30d,
  0 AS days_active_30d,
  0 AS lei_30d_plan
FROM public.students s
LEFT JOIN mart.student_current_lesson_v scl ON scl.student_id = s.id;

-- mart.student_plan_lessons_with_status_v  
CREATE OR REPLACE VIEW mart.student_plan_lessons_with_status_v AS
SELECT
  -- Define student lesson plan with completion tracking
  -- This requires business logic for what constitutes a "plan"
FROM public.lessons l
-- Join with student attendance/progress data
;
```

### Option 2: Refactor Code
Replace view queries with direct table queries that compute metrics on-the-fly. This would require:
1. Moving aggregation logic into TypeScript
2. Potentially adding new API endpoints for metrics
3. May impact performance for complex calculations

## 📊 Current Working Features

With the current changes, these features work correctly:

✅ Student Management List
- Shows all students with current lesson from `mart.student_current_lesson_v`
- Displays all flags from `student_flags_v`
- Filters and sorting work correctly

✅ Student Profile - Basic Info
- Student details CRUD operations
- Payment schedule management
- Notes management
- Exam management
- Instructivos management
- Attendance history

✅ Student Flags Display
- `is_new_student`
- `is_exam_preparation`
- `is_under_management_supervision`
- `is_absent_7d`
- `is_slow_progress_14d`
- `instructivo_active`
- `instructivo_overdue`

## ⚠️ Limited/Degraded Features

❌ Coach Panel
- Profile header metrics (nulls displayed)
- Learning efficiency index (LEI)
- Progress forecasting
- Pace tracking

❌ Lesson Journey
- Full curriculum visualization
- Lesson completion tracking  
- Progress through plan
- Time spent per lesson

These features will show limited or no data until the deprecated views are available.

## 🎯 Recommendation

**Immediate:** The current changes allow the app to run without errors and provide core student management functionality.

**Next Steps:** 
1. Recreate `mart.coach_panel_v` and `mart.student_plan_lessons_with_status_v` views
2. Test coach panel and lesson journey features
3. Verify all metrics are calculating correctly
4. Consider adding database migrations to ensure views exist

**Alternative:** If views cannot be recreated, plan a larger refactor to compute metrics in the application layer.
