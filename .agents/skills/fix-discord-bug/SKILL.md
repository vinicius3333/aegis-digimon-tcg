---
name: fix-discord-bug
description: Audit, fix, and test an Aegis bug reported in the Discord bug channel. Reads the report, checks the production logs on the Oracle VPS, confirms the printed card text, fixes the card IR or engine in a fix/ worktree branch, sweeps for other affected cards, and adds a playable dev arena scenario. Use when the user asks to fix a new or specific Discord bug.
---

# Fix a Discord bug

The printed card and the rules are the contract. A player's report is a symptom, not a
diagnosis. Confirm every claim against the official card before changing anything.

## 1. Read the report

- Newest open reports: `mcp__aegis-discord-bugs__list_bugs` (status `open`), then
  `get_bug` for the full thread and attachments.
- Split a report that names several cards into separate findings.
- Do not reply to, close, or change the status of the Discord thread unless the user asks.

## 2. Create the worktree

Use `EnterWorktree`, then rename the branch to `fix/<short-slug>`:

```bash
/usr/bin/git branch -m fix/<short-slug>
pnpm install --frozen-lockfile && pnpm --filter @aegis/shared build
```

Worktree guard: run plain, single git commands with `/usr/bin/git`. Pipes, `-C`, or `xargs`
around git are refused.

## 3. Check the production logs

```bash
ssh oracle-vps 'docker ps --format "{{.Names}} {{.Status}}" | grep aegis'
ssh oracle-vps 'cd /opt/aegis-rollout/logs && grep -l "<CARD-ID>" api-<YYYY-MM-DD>-*.jsonl'
ssh oracle-vps 'cd /opt/aegis-rollout/logs && grep -h "<CARD-ID>" api-<YYYY-MM-DD>-*.jsonl | head -c 4000'
```

- Containers restart on every deploy, so `docker logs` is short. The JSONL files in
  `/opt/aegis-rollout/logs` persist across deploys.
- Match the report's time (UTC) and player name to a `matchId`, then read that match's
  events around the failing action.
- No log hit is still a result. Say so in the report.

## 4. Establish the printed contract

1. Local catalog: `packages/shared/src/cards/data/cards.json` (`effectText`,
   `optionEffect`, `isDualCard`, `evoCosts`).
2. Official image (primary source). Download it and view it with `Read`:
   `https://world.digimoncard.com/images/cardlist/card/<CARD-ID>.png`
3. digimoncard.io (secondary; it can drop lines):
   `curl -sL 'https://digimoncard.io/api-public/search?card=<CARD-ID>'`
4. Rulings: `node tools/kb/query.mjs card <CARD-ID>`, `data/kb/qa.json`,
   `data/kb/rules/manual.md`, and `docs/audits/engine/*.md`.

Special rule lines (`[Digivolve]`, `[DNA Digivolve]`, `[DigiXros]`, `[Assembly]`) are
sometimes missing from `cards.json`. They need both the catalog text and the IR field
(`digivolutionRequirement`, `dnaDigivolveRequirement`, `digiXrosRequirement`,
`assemblyRequirement`).

## 5. Find the root cause and fix it

- Card modules: `apps/api/src/cards/<SET>/<ID>.ts`. Register only with `registerIrCard`.
- Decide whether the defect is card data, card IR, or a shared engine path. Prefer the
  narrowest correct fix. Widen the engine only when the rules say every card behaves that
  way, and check that the wider change does not open an illegal choice elsewhere.
- Write the regression test first in `<ID>.test.ts`, drive it through public intents
  (`applyIntent`), and confirm it fails without the fix (red), then passes (green).
  Name the Discord bug id in the test title.
- After changing a card module, sync its IR snapshot with Node 26:

  ```bash
  /opt/homebrew/bin/node tools/sync-effects-from-card-modules.mjs --set <SET>
  ```

Known mechanism: DUAL cards can't be played, but a printed "play or use" may use their
Option side. The IR must set `chooseDualMode: true` on those `PlayWithoutCost` actions.

## 6. Sweep for affected cards

Write a throwaway scan in the session scratchpad, never in the repo. Two sources work well:

- `packages/shared/src/effects/effects.json`: the synced IR of every card. Walk it for the
  action shape that caused the bug (for example, a `Play*` target naming Option plus
  Digimon/Tamer without `chooseDualMode`).
- The `@aegis/shared` resolvers (`assemblyRequirementFor`, `digivolutionRequirementsFor`,
  `dnaDigivolutionRequirementsFor`, `digiXrosRequirementFor`) after
  `pnpm --filter @aegis/shared build`, compared with the `xros_req` and `alt_effect` fields
  of the digimoncard.io dump (`https://digimoncard.io/api-public/search?series=Digimon%20Card%20Game`).
  Import the package from `apps/api` so it resolves.

`tsx` can't load the schema decorators; use plain Node against the built package, or a
temporary vitest file that you delete afterwards.

Classify each hit: same bug (fix it), latent (no card reaches it today), or a different
defect (report it, don't fix it silently). Confirm data gaps on the official image.

## 7. Add the dev arena scenario

Follow an existing entry such as `arena-ex7-seventh-fascination-turn`:

1. `apps/api/src/engine/devScenario.ts`: a `lay<Name>Scenario` layout, its id in
   `DEV_SCENARIO_IDS`, and its entry in `LAYOUTS`.
2. `apps/web/src/net/types.ts`: the id in the scenario union.
3. `apps/web/src/dev/LiveArenaDemo.tsx`: `SCENARIO_NOTES` (ptBR and en steps with the
   expected result) and `SCENARIO_OPTIONS` (menu label).
4. `apps/api/src/engine/<name>Scenario.test.ts`: `layDevScenario`, then
   `startTurnLoop()` → wait for `Phase.Breeding` → `endPhase` →
   `advance(engine).waitForMainPhase(0)` before the first intent.

Gotchas:

- `autoSelectCards` picks the first legal candidate. Keep the repro state unambiguous.
- An earlier action's effect can consume later materials. Order the steps, and write the
  same order in the arena note.
- Wait for the final state and `pendingDecision === undefined`, not for an intermediate
  memory value.

## 8. Gates

```bash
pnpm --filter @aegis/api exec vitest run src/cards/<SET> <engine suites touched> src/engine/<name>Scenario.test.ts
pnpm --filter @aegis/api typecheck
pnpm --filter @aegis/web exec tsc --noEmit -p tsconfig.json
pnpm exec oxlint <changed files>
pnpm exec oxfmt --check <changed files>
/usr/bin/git diff --check
```

## 9. Finish

- Do not add bug reports to `docs/audits/*.md`.
- Delete every scratch file and folder you created (dumps, images, scan copies).
- Commit only when the user asks: conventional commits, one concern each, no AI
  attribution.
- Report: the cause of each finding, the fix, the red/green evidence, the sweep results
  split by class, the scenario ids, and anything the report got wrong.
