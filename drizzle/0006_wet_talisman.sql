CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"provider" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"github_issue_id" bigint NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"html_url" text NOT NULL,
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"author" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"closed_at" timestamp,
	"last_fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_github_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"github_id" bigint NOT NULL,
	"login" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"profile_url" text,
	"access_token_hash" text,
	"scope" text,
	"linked_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_onboarding_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"skill_level" text DEFAULT 'intermediate' NOT NULL,
	"weekly_hours" integer DEFAULT 4 NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_repo_journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"repo_id" uuid NOT NULL,
	"issue_number" integer,
	"status" text DEFAULT 'note' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"query" text,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"alert_enabled" boolean DEFAULT true NOT NULL,
	"last_matched_repo_id" uuid,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_collections" ADD COLUMN "share_slug" text;--> statement-breakpoint
ALTER TABLE "user_collections" ADD COLUMN "template_key" text;--> statement-breakpoint
ALTER TABLE "user_collections" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "excluded_languages" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "excluded_topics" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "exclude_archived" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "exclude_resource_lists" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "exclude_low_activity" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "setup_difficulty" text DEFAULT 'any' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_issues" ADD CONSTRAINT "repo_issues_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_github_accounts" ADD CONSTRAINT "user_github_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding_profiles" ADD CONSTRAINT "user_onboarding_profiles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_repo_journal_entries" ADD CONSTRAINT "user_repo_journal_entries_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_repo_journal_entries" ADD CONSTRAINT "user_repo_journal_entries_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_searches" ADD CONSTRAINT "user_saved_searches_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_searches" ADD CONSTRAINT "user_saved_searches_last_matched_repo_id_repos_id_fk" FOREIGN KEY ("last_matched_repo_id") REFERENCES "public"."repos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_deliveries_user_idx" ON "email_deliveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_status_idx" ON "email_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_deliveries_type_idx" ON "email_deliveries" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "repo_issues_repo_number_idx" ON "repo_issues" USING btree ("repo_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "repo_issues_github_id_idx" ON "repo_issues" USING btree ("github_issue_id");--> statement-breakpoint
CREATE INDEX "repo_issues_repo_state_idx" ON "repo_issues" USING btree ("repo_id","state");--> statement-breakpoint
CREATE INDEX "repo_issues_updated_idx" ON "repo_issues" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_github_accounts_github_id_idx" ON "user_github_accounts" USING btree ("github_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_github_accounts_user_login_idx" ON "user_github_accounts" USING btree ("user_id","login");--> statement-breakpoint
CREATE INDEX "user_github_accounts_user_idx" ON "user_github_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_repo_journal_user_repo_idx" ON "user_repo_journal_entries" USING btree ("user_id","repo_id");--> statement-breakpoint
CREATE INDEX "user_repo_journal_status_idx" ON "user_repo_journal_entries" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_saved_searches_user_name_idx" ON "user_saved_searches" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "user_saved_searches_user_idx" ON "user_saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_saved_searches_alert_idx" ON "user_saved_searches" USING btree ("alert_enabled","last_checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_collections_share_slug_idx" ON "user_collections" USING btree ("share_slug");--> statement-breakpoint
CREATE INDEX "user_collections_visibility_idx" ON "user_collections" USING btree ("visibility");