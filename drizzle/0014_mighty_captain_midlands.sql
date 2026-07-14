ALTER TABLE "auth_email_allowlist" ADD CONSTRAINT "auth_email_allowlist_kind_check" CHECK ("auth_email_allowlist"."kind" in ('email', 'domain'));--> statement-breakpoint
ALTER TABLE "auth_invites" ADD CONSTRAINT "auth_invites_role_check" CHECK ("auth_invites"."role" in ('user', 'admin'));--> statement-breakpoint
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_role_check" CHECK ("auth_users"."role" in ('user', 'admin'));--> statement-breakpoint
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_status_check" CHECK ("auth_users"."status" in ('active', 'suspended'));--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_status_check" CHECK ("email_deliveries"."status" in ('queued', 'sent', 'skipped', 'failed'));--> statement-breakpoint
ALTER TABLE "repo_issues" ADD CONSTRAINT "repo_issues_state_check" CHECK ("repo_issues"."state" in ('open', 'closed'));--> statement-breakpoint
ALTER TABLE "user_collections" ADD CONSTRAINT "user_collections_visibility_check" CHECK ("user_collections"."visibility" in ('private', 'shared'));--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_target_type_check" CHECK ("user_follows"."target_type" in ('repo', 'organization'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_default_sort_check" CHECK ("user_preferences"."default_sort" in ('relevance', 'stars', 'forks', 'recent', 'updated', 'contribution'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_theme_check" CHECK ("user_preferences"."theme" in ('light', 'dark', 'system'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_digest_frequency_check" CHECK ("user_preferences"."digest_frequency" in ('off', 'daily', 'weekly', 'monthly'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_digest_day_check" CHECK ("user_preferences"."digest_day" between 0 and 6);--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_min_stars_check" CHECK ("user_preferences"."min_stars" between 0 and 10000000);--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_setup_difficulty_check" CHECK ("user_preferences"."setup_difficulty" in ('any', 'easy', 'medium', 'advanced'));--> statement-breakpoint
ALTER TABLE "user_recent_views" ADD CONSTRAINT "user_recent_views_target_type_check" CHECK ("user_recent_views"."target_type" in ('repo', 'organization'));--> statement-breakpoint
ALTER TABLE "user_repo_states" ADD CONSTRAINT "user_repo_states_pipeline_stage_check" CHECK ("user_repo_states"."pipeline_stage" in ('interested', 'opened_issue', 'submitted_pr', 'done'));