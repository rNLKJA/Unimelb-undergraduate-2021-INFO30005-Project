-- Governance: audit_log is append-only, and an ai_audit_log call record is
-- immutable apart from one human review decision. The only way rows leave
-- either table is a full demo reset (clearDatabase in src/db/seed.ts), which
-- sets the `demo_reset_in_progress` flag in app_meta while it wipes every table.
CREATE TRIGGER `audit_log_no_update` BEFORE UPDATE ON `audit_log`
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
--> statement-breakpoint
CREATE TRIGGER `audit_log_no_delete` BEFORE DELETE ON `audit_log`
WHEN NOT EXISTS (SELECT 1 FROM `app_meta` WHERE `key` = 'demo_reset_in_progress')
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
--> statement-breakpoint
CREATE TRIGGER `ai_audit_log_record_immutable`
BEFORE UPDATE OF `id`, `created_at`, `feature`, `provider`, `model`, `actor_id`, `input`, `output`, `output_text`, `error_kind`, `error_message`, `latency_ms`, `input_tokens`, `output_tokens`, `fact_check` ON `ai_audit_log`
BEGIN
  SELECT RAISE(ABORT, 'ai_audit_log call records are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `ai_audit_log_decide_once`
BEFORE UPDATE OF `human_decision`, `edited_output`, `decided_at` ON `ai_audit_log`
WHEN OLD.`human_decision` <> 'pending' OR NEW.`human_decision` = 'pending'
BEGIN
  SELECT RAISE(ABORT, 'an AI output can be reviewed only once');
END;
--> statement-breakpoint
CREATE TRIGGER `ai_audit_log_no_delete` BEFORE DELETE ON `ai_audit_log`
WHEN NOT EXISTS (SELECT 1 FROM `app_meta` WHERE `key` = 'demo_reset_in_progress')
BEGIN
  SELECT RAISE(ABORT, 'ai_audit_log is append-only');
END;
