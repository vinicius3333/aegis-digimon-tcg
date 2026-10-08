# Feedback storage and administrator inbox

Feedback submissions persist in the existing Aegis Postgres database before the optional GitHub write. Migration 024 adds feedback_reports without changing existing data. The store shares the account connection pool and migrator. Reports retain their original fields, match ID, build context, timestamp and authenticated account ID.

The existing accounts.is_admin permission protects GET /account/feedback on the server. The client exposes /admin/feedback through the account menu only to administrators. Production inspection on 2026-10-08 confirmed Vn is the only administrator. Authorization uses the stored permission, never an editable display name. New accounts remain non-admin.

The inbox presents 50 reports per page in descending ID order, using a bounded cursor query. Text renders as plain text. It includes anonymous reports, card IDs, match and browser context, and GitHub copy status. Responses and client fetches disable caching.

## GitHub flag

FEEDBACK_GITHUB_ENABLED defaults to true. Existing GITHUB_TOKEN and GITHUB_BUG_REPOSITORY settings remain required for the mirror. Set FEEDBACK_GITHUB_ENABLED=false in the deployment environment and recreate/redeploy the API containers to stop future GitHub copies. Postgres submissions remain enabled, and existing GitHub issues remain unchanged. docker-compose.prod.yml forwards the flag to every API replica.

The public form states reports may be published to GitHub. A database failure returns an error before calling GitHub. A GitHub failure or ten-second timeout does not fail an already saved submission. Mirror state is recorded as sent, failed, disabled or pending (awaiting confirmation). There is no automatic retry: a process interruption can leave a pending copy, and a network timeout may occur after GitHub accepted it. The inbox exposes that uncertainty without creating duplicate issues automatically.

This change stores new submissions; it does not import historical issues, duplicate replay files, or introduce feedback status editing. Deployment applies the migration through the existing startup/lazy initialization process.

## Verification

Cover authenticated and anonymous writes, disabled/missing GitHub configuration, GitHub and database failures, rejected unauthenticated/non-admin reads, fresh permission checks, cursor validation/pagination, and UI loading/error/empty states. Run API and web typechecks and the affected tests before committing.

Validation completed locally with Node 26: 70 API/migration tests, 57 web tests, 3 gateway tests, and 5 Chromium tests. Browser checks cover 320, 768, 1024 and 1440 px, keyboard expansion of report context, scroll clearance above navigation, and denied access. API/web typechecks, the web production build, scoped lint and diff whitespace checks pass. The routing review moved the API under the existing /account proxy while retaining /admin/feedback for the SPA. No production deployment or historical import was performed.
