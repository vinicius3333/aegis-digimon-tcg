# Repository Instructions

## Development

- Use the Node and pnpm versions in root `package.json`.
- The API owns game state and rules; the client presents synchronized state and sends intents. See [architecture](docs/ARCHITECTURE.md).
- Start the app with `pnpm dev`. Restart after API changes: the API runs compiled code without source watching.
- Build changed shared contracts before focused tests: `pnpm --filter @aegis/shared build`.
- Write GitHub issue titles, descriptions, comments, and verification reports in English.
- Follow the authorized branch and delivery scope. Distinguish local fixes from deployed fixes.

## KB and Rules

- Check the exact card in `packages/shared/src/cards/data/cards.json` and its implementation in `apps/api/src/cards/<SET>/`.
- Query local official Q&A, errata, restrictions, and rules:

  ```sh
  node tools/kb/query.mjs card BT20-016 --json
  node tools/kb/query.mjs rules "DNA digivolution" --limit 5 --json
  ```

- Search rules in English; read the full returned text and referenced sections. Chunk IDs are KB references, not printed rule numbers. Card queries do not include the complete printed card text.
- Check official card images at `https://world.digimoncard.com/images/cardlist/card/<CARD-ID>.png` and rulings at `https://world.digimoncard.com/rule/?card_no=<CARD-ID>`. Prefer official sources; do not guess ambiguous behavior.
- The KB in `data/kb/` is a snapshot. `pnpm verify:rules-source` checks rules freshness and requires `pdftotext`; Q&A, errata, and restrictions need their own currency checks. Do not scrape or rebuild the KB as a routine fix. See [KB tooling](tools/kb/README.md).
- In conformance tests, use `cite()` with a reviewed literal fingerprint and note; run `node tools/kb/check-conformance-citations.mjs` after citation changes. See [conformance guidance](apps/api/src/engine/conformance/README.md).
- Use [verify-card-implementation](.agents/skills/verify-card-implementation/SKILL.md) for card behavior and [fix-discord-bug](.agents/skills/fix-discord-bug/SKILL.md) for Discord reports. Read the full thread and attachments; follow current paths and session authorization. Production investigation must follow the host's instructions and resource guard.

## Card Changes

- Register executable card behavior exclusively with `registerIrCard(cardId, compiled)`. Do not add a second `registerCard` registration; it is reserved for existing legacy compatibility, engine tests, and justified internal seams.
- Synchronize and check changed card effect snapshots:

  ```sh
  node tools/sync-effects-from-card-modules.mjs --set <SET>
  node tools/sync-effects-from-card-modules.mjs --set <SET> --check
  ```

## Tests

- Put game scenarios and bug regressions in `apps/api/src/engine/scenarios/<behavior>.test.ts`, card tests in `apps/api/src/cards/<SET>/`, and mechanism tests beside their implementation. Keep issue IDs in descriptions or comments.
- Reuse `engine/testkit`; exercise public intents and assert costs, card identities, destinations, effect order, and turn progression, including relevant refusal or illegal-action branches.
- Run focused tests, then affected suites. For controlled API runs:

  ```sh
  pnpm --filter @aegis/api exec vitest run src/engine/scenarios/<behavior>.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
  ```

- Put browser specs in `apps/web/e2e/` using the real GameScreen and Colyseus harness. Run one Playwright instance at a time:

  ```sh
  NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/web test:browser <spec>.spec.ts
  ```

- Never use `waitForTimeout` or fixed sleeps for E2E synchronization. Wait for visible controls, decisions, state transitions, and queue completion. See [E2E setup](apps/web/e2e/README.md).
- Reuse `scenario-page.ts` to check decision visibility, draw/zone presentation, and effect resettling. Assert that the queue drains without failures or expired gates; exclude human response time. Document timing exceptions per sequence rather than raising all budgets.
- Use Orca Browser through the public `orca` CLI for requested manual checks. For layout changes, verify narrow/wide viewports and dark/light modes in the shared product component.
- Run relevant checks and `git diff --check`; report failures and coverage limits. Fix shared product code, not only dev fixtures. Do not create task-specific planning documents unless requested.
