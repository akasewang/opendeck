CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "vector";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean NOT NULL,
  "image" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp,
  "updated_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "curated_source" AS ENUM ('yc', 'manual', 'import');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "follow_target_type" AS ENUM ('repo', 'language', 'topic');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "ingest_kind" AS ENUM ('trending', 'metadata', 'curated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "ingest_status" AS ENUM ('running', 'success', 'failed', 'partial');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "digest_cadence" AS ENUM ('daily', 'weekly', 'off');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gh_id" bigint NOT NULL,
  "full_name" text NOT NULL,
  "owner" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "language" text,
  "stars" integer DEFAULT 0 NOT NULL,
  "forks" integer DEFAULT 0 NOT NULL,
  "open_issues" integer DEFAULT 0 NOT NULL,
  "license" text,
  "topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "html_url" text NOT NULL,
  "avatar_url" text,
  "homepage_url" text,
  "default_branch" text,
  "is_archived" boolean DEFAULT false NOT NULL,
  "has_good_first_issues" boolean DEFAULT false NOT NULL,
  "contributors" integer DEFAULT 0 NOT NULL,
  "pushed_at" timestamp,
  "created_at" timestamp,
  "updated_at" timestamp,
  "readme_excerpt" text,
  "etag" text,
  "last_fetched_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "repos_gh_id_idx" ON "repos" ("gh_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "repos_full_name_idx" ON "repos" ("full_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repos_language_idx" ON "repos" ("language");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repos_stars_idx" ON "repos" ("stars");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repos_forks_idx" ON "repos" ("forks");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repos_pushed_at_idx" ON "repos" ("pushed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repos_updated_at_idx" ON "repos" ("updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repo_embeddings" (
  "repo_id" uuid PRIMARY KEY NOT NULL REFERENCES "repos"("id") ON DELETE cascade,
  "embedding" vector(768) NOT NULL,
  "model" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repo_embeddings_embedding_idx" ON "repo_embeddings" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repo_summaries" (
  "repo_id" uuid PRIMARY KEY NOT NULL REFERENCES "repos"("id") ON DELETE cascade,
  "summary" text NOT NULL,
  "model" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "curated_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "repo_id" uuid NOT NULL REFERENCES "repos"("id") ON DELETE cascade,
  "source" "curated_source" DEFAULT 'yc' NOT NULL,
  "batch" text,
  "company" text,
  "logo_url" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "curated_projects_source_repo_idx" ON "curated_projects" ("source", "repo_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "curated_projects_source_idx" ON "curated_projects" ("source");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "follows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "target_type" "follow_target_type" NOT NULL,
  "target_value" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "follows_user_target_idx" ON "follows" ("user_id", "target_type", "target_value");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "follows_target_idx" ON "follows" ("target_type", "target_value");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "is_public" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collections_user_slug_idx" ON "collections" ("user_id", "slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collections_public_slug_idx" ON "collections" ("slug", "is_public");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collection_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "collection_id" uuid NOT NULL REFERENCES "collections"("id") ON DELETE cascade,
  "repo_id" uuid NOT NULL REFERENCES "repos"("id") ON DELETE cascade,
  "position" integer DEFAULT 0 NOT NULL,
  "added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collection_items_collection_repo_idx" ON "collection_items" ("collection_id", "repo_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collection_items_collection_position_idx" ON "collection_items" ("collection_id", "position");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "dedupe_key" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "last_notified_at" timestamp,
  "sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_user_dedupe_idx" ON "notifications" ("user_id", "dedupe_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_sent_idx" ON "notifications" ("user_id", "sent_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "digest_cadence" "digest_cadence" DEFAULT 'weekly' NOT NULL,
  "email_digests" boolean DEFAULT true NOT NULL,
  "digest_hour" integer DEFAULT 9 NOT NULL,
  "last_digest_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_cursors" (
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "target_type" "follow_target_type" NOT NULL,
  "target_value" text NOT NULL,
  "last_notified_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alert_cursors_user_target_idx" ON "alert_cursors" ("user_id", "target_type", "target_value");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ingest_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" "ingest_kind" NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp,
  "tokens_used" integer DEFAULT 0 NOT NULL,
  "rate_limit_remaining" integer,
  "status" "ingest_status" DEFAULT 'running' NOT NULL,
  "error" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repo_metric_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "repo_id" uuid NOT NULL REFERENCES "repos"("id") ON DELETE cascade,
  "stars" integer DEFAULT 0 NOT NULL,
  "forks" integer DEFAULT 0 NOT NULL,
  "open_issues" integer DEFAULT 0 NOT NULL,
  "captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repo_metric_snapshots_repo_time_idx" ON "repo_metric_snapshots" ("repo_id", "captured_at");
