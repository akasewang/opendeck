DELETE FROM "auth_tokens" WHERE "type" = 'email_verification';--> statement-breakpoint
ALTER TABLE "auth_users" DROP COLUMN "email_verified_at";
