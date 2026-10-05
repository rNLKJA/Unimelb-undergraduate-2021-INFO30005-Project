ALTER TABLE `ai_audit_log` ADD `input_matches_server` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `closed_out_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `fulfilment_imputed` integer DEFAULT false NOT NULL;