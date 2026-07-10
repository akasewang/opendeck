CREATE TABLE "auth_email_allowlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"kind" text DEFAULT 'email' NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"token_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"repo_id" uuid,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"repo_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_key" text NOT NULL,
	"repo_id" uuid,
	"alert_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"default_language" text,
	"default_sort" text DEFAULT 'contribution' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"preferred_languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_stars" integer DEFAULT 0 NOT NULL,
	"include_low_issue_count" boolean DEFAULT true NOT NULL,
	"email_digest_enabled" boolean DEFAULT false NOT NULL,
	"digest_frequency" text DEFAULT 'weekly' NOT NULL,
	"digest_day" integer DEFAULT 1 NOT NULL,
	"good_first_alerts_enabled" boolean DEFAULT true NOT NULL,
	"private_profile" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_recent_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_key" text NOT NULL,
	"repo_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_repo_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"repo_id" uuid NOT NULL,
	"saved_at" timestamp,
	"hidden_at" timestamp,
	"dismissed_at" timestamp,
	"reviewed_at" timestamp,
	"pipeline_stage" text DEFAULT 'interested' NOT NULL,
	"note" text,
	"alert_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "last_login_at" timestamp;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
ALTER TABLE "auth_email_allowlist" ADD CONSTRAINT "auth_email_allowlist_created_by_auth_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_invites" ADD CONSTRAINT "auth_invites_invited_by_auth_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_alerts" ADD CONSTRAINT "user_alerts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_alerts" ADD CONSTRAINT "user_alerts_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_collection_items" ADD CONSTRAINT "user_collection_items_collection_id_user_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."user_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_collection_items" ADD CONSTRAINT "user_collection_items_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_collections" ADD CONSTRAINT "user_collections_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recent_views" ADD CONSTRAINT "user_recent_views_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recent_views" ADD CONSTRAINT "user_recent_views_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_repo_states" ADD CONSTRAINT "user_repo_states_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_repo_states" ADD CONSTRAINT "user_repo_states_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_email_allowlist_pattern_idx" ON "auth_email_allowlist" USING btree ("pattern");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_invites_token_hash_idx" ON "auth_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_invites_email_idx" ON "auth_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_invites_expires_idx" ON "auth_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_token_hash_idx" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_tokens_email_type_idx" ON "auth_tokens" USING btree ("email","type");--> statement-breakpoint
CREATE INDEX "auth_tokens_expires_idx" ON "auth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_alerts_user_read_idx" ON "user_alerts" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "user_alerts_repo_idx" ON "user_alerts" USING btree ("repo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_collection_items_collection_repo_idx" ON "user_collection_items" USING btree ("collection_id","repo_id");--> statement-breakpoint
CREATE INDEX "user_collection_items_repo_idx" ON "user_collection_items" USING btree ("repo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_collections_user_name_idx" ON "user_collections" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "user_collections_user_idx" ON "user_collections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_follows_user_target_idx" ON "user_follows" USING btree ("user_id","target_type","target_key");--> statement-breakpoint
CREATE INDEX "user_follows_user_idx" ON "user_follows" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_recent_views_user_target_idx" ON "user_recent_views" USING btree ("user_id","target_type","target_key");--> statement-breakpoint
CREATE INDEX "user_recent_views_user_time_idx" ON "user_recent_views" USING btree ("user_id","viewed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_repo_states_user_repo_idx" ON "user_repo_states" USING btree ("user_id","repo_id");--> statement-breakpoint
CREATE INDEX "user_repo_states_user_saved_idx" ON "user_repo_states" USING btree ("user_id","saved_at");--> statement-breakpoint
CREATE INDEX "user_repo_states_pipeline_idx" ON "user_repo_states" USING btree ("user_id","pipeline_stage");--> statement-breakpoint
CREATE INDEX "auth_users_role_idx" ON "auth_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "auth_users_status_idx" ON "auth_users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auth_sessions_revoked_idx" ON "auth_sessions" USING btree ("revoked_at");