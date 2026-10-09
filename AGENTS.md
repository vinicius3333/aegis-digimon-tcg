# Repository Instructions

## Runtime and Architecture

- Use the Node and pnpm versions declared in root `package.json` (currently Node 26 and pnpm 10). Check the active Node version before building or testing.
- The API owns game state and rules; the React client presents synchronized state and sends intents. See [architecture](docs/ARCHITECTURE.md).
- Run the local app with `pnpm dev`. The API dev command compiles and starts `dist/index.js` without watching source changes; restart it after API changes. Frontend HMR does not refresh the API runtime.
- Build shared contracts with `pnpm --filter @aegis/shared build` before direct focused tests that depend on changed shared code.

## GitHub Issues

- Always write all GitHub issue content in English, including titles, descriptions, comments, status updates, and verification reports.
- Treat reports as symptoms to reproduce, not as authoritative rules interpretations. State what was reproduced, fixed, and verified, and distinguish local changes from deployed changes.
- Follow the user's authorized branch and delivery scope. A local commit does not imply permission to push, deploy, or send Discord messages.

## Knowledge Base and Rules Research

- Start card investigations with the exact ID in `packages/shared/src/cards/data/cards.json`, its module in `apps/api/src/cards/<SET>/`, and local official Q&A, errata, and restrictions:

  ```sh
  node tools/kb/query.mjs card BT20-016
  node tools/kb/query.mjs card BT20-016 --json
  node tools/kb/query.mjs rules "DNA digivolution" --limit 5 --json
  ```

- Search rules in English. JSON rule results include the chunk ID, source, section, and full text; inspect the full clause and referenced sections rather than relying on a ranked snippet. Chunk IDs are repository references, not printed rule numbers.
- The normalized KB lives in `data/kb/`: `rules-index.json`, `rules/`, `qa.json`, `errata.json`, and `banlist.json`. Card queries return rulings and corrections, not the complete printed card text. No KB entries does not mean no effect or no applicable ruling.
- Compare the complete card text, including inherited/security effects and alternative requirements, with the official card image when needed: `https://world.digimoncard.com/images/cardlist/card/<CARD-ID>.png`. Confirm ambiguous or potentially stale rulings at `https://world.digimoncard.com/rule/?card_no=<CARD-ID>` and the official rules downloads. Prefer official sources over third-party summaries or recollection; record unresolved ambiguity rather than inventing behavior.
- Local KB data is a snapshot. Check source dates before claiming current official coverage. `pnpm verify:rules-source` checks rules freshness without rewriting files and requires Poppler's `pdftotext`; it does not certify that all Q&A, errata, or restrictions are current.
- Do not run a full scrape or rebuild the rules index as a routine bug-fix step. Source updates require reviewed rule and citation reconciliation. See [KB tooling](tools/kb/README.md).
- For conformance tests, use `cite()` from `apps/api/src/engine/conformance/_kb.ts` with a reviewed literal fingerprint and meaningful note. Do not derive the expected fingerprint from the current KB inside the test. Run `node tools/kb/check-conformance-citations.mjs` after changing citations. Citations establish the source, not behavioral proof; see [conformance guidance](apps/api/src/engine/conformance/README.md).
- For card fidelity work, follow [verify-card-implementation](.agents/skills/verify-card-implementation/SKILL.md). For Discord reports, follow [fix-discord-bug](.agents/skills/fix-discord-bug/SKILL.md), using current repository paths and session authorization. Read the complete thread and attachments; keep production investigation read-only, bounded, and compliant with the host's instructions and resource guard.

## Card Registration

- Card modules under `apps/api/src/cards` must register their executable behavior exclusively with `registerIrCard(cardId, compiled)`.
- Auditors must not add or preserve a second `registerCard` registration for the same card. When an audited card is still handwritten, port it to compiled IR or record the unresolved limitation and keep it below 10/10.
- `registerCard` is reserved for existing legacy compatibility, engine tests, and explicitly justified internal seams; it must not be introduced in new card implementations or audit fixes.
- After changing a card module, synchronize and check its committed effect snapshot:

  ```sh
  node tools/sync-effects-from-card-modules.mjs --set <SET>
  node tools/sync-effects-from-card-modules.mjs --set <SET> --check
  ```

## Audit Documents

- `docs/audits/<SET>.md` is the only audit ledger for a card collection. One document per directory under `apps/api/src/cards`, except `_a3`.
- Write audit evidence nowhere else. Do not add per-card files, range reports, batch reports, logs, PNGs, or JSON under `docs/audits/`.
- Cross-set engine audits live in `docs/audits/engine/` with kebab-case file names.
- `docs/audits/README.md` holds the rules, the template, and a status index generated by `pnpm audit:index`. `apps/api/src/cards/audit-docs.test.ts` enforces the layout.

## Scenario Tests

- Put specific game scenarios and reported-bug regressions in `apps/api/src/engine/scenarios/`, including reproductions that exercise multiple cards or the live turn loop.
- Keep general engine mechanism tests beside their implementation and individual card behavior tests under `apps/api/src/cards/<SET>/`.
- Name new scenario files after the behavior being exercised (`<behavior>.test.ts`). Keep issue numbers and report dates in test descriptions or comments for traceability, rather than using them as the primary file name.
- Reuse `engine/testkit` for setup, actions, and observations. Run the scenario suite with `pnpm --filter @aegis/api exec vitest run src/engine/scenarios/`.
- Exercise public intents and observable state for game regressions. Verify costs, physical card identities and destinations, effect order, and turn progression; include relevant refusal or illegal-action branches. Direct helper tests alone do not prove the live turn loop works.
- Run focused tests first, then affected mechanism and collection suites when shared behavior changes. Use `--pool=forks --maxWorkers=1 --no-file-parallelism` for controlled API runs; conformance also has `pnpm --filter @aegis/api test:conformance`.
- Do not add task-specific design or implementation-plan documents under `docs/plans/` unless explicitly requested.

## Browser and Animation Regressions

- Put Playwright specs in `apps/web/e2e/`. Use the real GameScreen and Colyseus harness; check gameplay outcomes as well as visible decisions and animation completion. Dev scenarios seed reproductions; fixes belong in shared product code.
- Run `NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/web test:browser <spec>.spec.ts`. This builds shared and API runtime code first. Run one Playwright instance at a time because the harness uses fixed ports. See [E2E setup and boundaries](apps/web/e2e/README.md).
- Do not use `waitForTimeout` or fixed sleeps to synchronize E2Es. Wait for visible controls, decision IDs, state transitions, or queue completion with assertions and bounded polling.
- Reuse `apps/web/e2e/scenario-page.ts` for scenario timing checks. Measure decision delivery to usable UI, draw/zone presentation, and effect resettling; assert the queue drains without failures or expired gates. Keep human response time separate from automatic presentation delay.
- Give a legitimate multi-animation sequence a documented, narrowly scoped timing budget. Do not raise all budgets to conceal one stalled step. Inspect the timing artifact and failing trace to identify the cause.
- For manual checks requested through Orca, use the public `orca` CLI and Orca Browser. Report measured results separately from automated coverage. For modal/layout fixes, check relevant narrow and wide viewports, dark/light modes, and the shared production component.

## Verification and Audit Completion

- Run checks appropriate to the changed code and `git diff --check`; report failures and verification limits honestly. A passing focused test, citation, or inventory count is not proof of complete rule coverage.
- For a requested full collection audit, recalculate the entire collection and require reproducible evidence for every claimed 10/10 score, with focused, mechanism, and collection tests. Do not mark a collection complete from a single card or checkpoint.
- Update an Orca audit worktree's completion status only when the assigned scope and delivery requirements are actually met. Claim a pushed branch only after an authorized push has succeeded; do not make pushing a prerequisite for local-only work.
