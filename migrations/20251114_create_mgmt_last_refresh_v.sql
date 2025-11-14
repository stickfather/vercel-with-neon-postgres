-- migrations/20251114_create_mgmt_last_refresh_v.sql
-- Restore mgmt.last_refresh_v to reflect latest MV refresh timestamp
CREATE SCHEMA IF NOT EXISTS mgmt;

CREATE OR REPLACE VIEW mgmt.last_refresh_v AS
SELECT max(refreshed_at) AT TIME ZONE 'UTC' AS refreshed_at
FROM mart.mv_refresh_log;
