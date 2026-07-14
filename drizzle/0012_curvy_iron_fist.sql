CREATE TABLE "automation_job_leases" (
	"key" text PRIMARY KEY NOT NULL,
	"holder_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_sync_states" (
	"repo_id" uuid PRIMARY KEY NOT NULL,
	"issues_fetched_at" timestamp NOT NULL,
	"issues_complete" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "repository_sync_states" ADD CONSTRAINT "repository_sync_states_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_idempotency_key_idx" ON "email_deliveries" USING btree ("idempotency_key");