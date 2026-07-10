CREATE TABLE "user_google_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT true NOT NULL,
	"name" text,
	"avatar_url" text,
	"access_token_hash" text,
	"refresh_token_hash" text,
	"scope" text,
	"linked_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_google_accounts" ADD CONSTRAINT "user_google_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_google_accounts_google_id_idx" ON "user_google_accounts" USING btree ("google_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_google_accounts_user_email_idx" ON "user_google_accounts" USING btree ("user_id","email");--> statement-breakpoint
CREATE INDEX "user_google_accounts_user_idx" ON "user_google_accounts" USING btree ("user_id");