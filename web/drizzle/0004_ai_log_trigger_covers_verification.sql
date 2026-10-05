-- Governance: migration 0003 added `input_matches_server` to ai_audit_log.
-- The immutability trigger from 0002 lists its columns explicitly, so it is
-- replaced (not edited) by one that also covers the new column. The record
-- stays immutable apart from the single human review decision.
DROP TRIGGER IF EXISTS `ai_audit_log_record_immutable`;
--> statement-breakpoint
CREATE TRIGGER `ai_audit_log_record_immutable`
BEFORE UPDATE OF `id`, `created_at`, `feature`, `provider`, `model`, `actor_id`, `input`, `output`, `output_text`, `error_kind`, `error_message`, `latency_ms`, `input_tokens`, `output_tokens`, `fact_check`, `input_matches_server` ON `ai_audit_log`
BEGIN
  SELECT RAISE(ABORT, 'ai_audit_log call records are immutable');
END;
