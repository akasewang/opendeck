ALTER TABLE "repository_sync_states" ADD COLUMN "issues_next_page" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "repository_sync_states" ADD COLUMN "issues_sync_started_at" timestamp;--> statement-breakpoint
CREATE INDEX "repository_sync_states_incomplete_idx" ON "repository_sync_states" USING btree ("issues_complete","updated_at");--> statement-breakpoint
ALTER TABLE "repository_sync_states" ADD CONSTRAINT "repository_sync_states_next_page_check" CHECK ("repository_sync_states"."issues_next_page" >= 1);