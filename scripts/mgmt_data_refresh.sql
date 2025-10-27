CREATE TABLE IF NOT EXISTS mgmt.data_refresh_log (
  id bigserial PRIMARY KEY,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW mgmt.last_refresh_v AS
SELECT refreshed_at
FROM mgmt.data_refresh_log
ORDER BY refreshed_at DESC
LIMIT 1;
