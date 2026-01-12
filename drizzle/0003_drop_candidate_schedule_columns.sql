-- ===========================================
-- MIGRATION: drop deprecated scheduling columns from candidates
-- ===========================================

ALTER TABLE candidates
  DROP COLUMN IF EXISTS scheduled_at,
  DROP COLUMN IF EXISTS calendar_event_id,
  DROP COLUMN IF EXISTS meet_link,
  DROP COLUMN IF EXISTS scheduling_status,
  DROP COLUMN IF EXISTS scheduling_last_error;
