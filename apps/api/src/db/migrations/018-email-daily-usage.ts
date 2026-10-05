import type { Migration } from "../migrator.js";

export const emailDailyUsage: Migration = {
  id: "018-email-daily-usage",
  up: "CREATE TABLE IF NOT EXISTS email_daily_usage (provider text NOT NULL, day text NOT NULL, sent integer NOT NULL DEFAULT 0, PRIMARY KEY (provider, day))",
};
