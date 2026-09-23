# Three local browser regressions

Approved scope: Chromium tests for chained security reveal, DNA via a real pointer drag, and a full page reload while a decision is pending. No CI.

Use Playwright with one worker, a real local Colyseus AegisRoom server, and Vite serving the real GameScreen, providers, and production CSS. A test-only HTML entry provides deterministic join options and a read-only snapshot of the actual browser connection. A headless second seat observes public state and advances turns where needed. No protagonist intents bypass the UI.

Keep tests in apps/web/e2e, outside the product entry graph. Existing Vitest scenarios remain. Build the API using its existing noCheck runtime build; browser verification does not imply an API typecheck passed. All Node processes use a 2048 MB heap limit; browser processes have additional memory usage.

Acceptance: all three tests pass in real Chromium; DNA proves exact source identities/order and zero cost; reload preserves the room and decision and permits one successful resolution; security reveal stays rendered until the chained decisions resolve. Retain failure screenshots and traces outside audit ledgers.
