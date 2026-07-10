DROP TABLE "user_github_accounts" CASCADE;--> statement-breakpoint
DROP TABLE "user_google_accounts" CASCADE;--> statement-breakpoint
ALTER TABLE "auth_users" DROP COLUMN "password_hash";