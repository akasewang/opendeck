ALTER TABLE "curated_projects" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "curated_projects" ALTER COLUMN "source" SET DEFAULT 'github'::text;--> statement-breakpoint
UPDATE "curated_projects" SET "source" = 'github' WHERE "source" = 'yc';--> statement-breakpoint
DROP TYPE "public"."curated_source";--> statement-breakpoint
CREATE TYPE "public"."curated_source" AS ENUM('github', 'manual', 'import');--> statement-breakpoint
ALTER TABLE "curated_projects" ALTER COLUMN "source" SET DEFAULT 'github'::"public"."curated_source";--> statement-breakpoint
ALTER TABLE "curated_projects" ALTER COLUMN "source" SET DATA TYPE "public"."curated_source" USING "source"::"public"."curated_source";--> statement-breakpoint
ALTER TABLE "ingest_runs" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
UPDATE "ingest_runs" SET "kind" = 'discovery' WHERE "kind" = 'curated';--> statement-breakpoint
DROP TYPE "public"."ingest_kind";--> statement-breakpoint
CREATE TYPE "public"."ingest_kind" AS ENUM('trending', 'metadata', 'discovery');--> statement-breakpoint
ALTER TABLE "ingest_runs" ALTER COLUMN "kind" SET DATA TYPE "public"."ingest_kind" USING "kind"::"public"."ingest_kind";
