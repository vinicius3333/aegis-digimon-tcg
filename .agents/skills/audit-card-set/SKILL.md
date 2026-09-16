---
name: audit-card-set
description: Re-audit a whole card set (for example BT23) against the single ledger docs/audits/<SET>.md, with one coordinator and parallel opus subagent lanes. Use when asked to audit, re-audit, finish or continue the audit of a set or collection, to implement newly revealed cards of a set, or to score cards against catalog, rulings and behavioural proof.
---

# Audit Card Set

The coordinator orchestrates; opus subagents do the card and engine work.
Each card is scored in the set ledger and only observable behaviour counts.
Per-card technique lives in the `verify-card-implementation` skill; this
skill is the set-level protocol around it.

`docs/audits/README.md` and `AGENTS.md` define the ledger rules. This skill
follows them; when they change, update this skill.

## Roles

| Role | Owns | Never touches |
| --- | --- | --- |
| Coordinator (you) | `docs/audits/<SET>.md`, catalog JSON, effects sync, shared data overrides, gates, commits | card modules, engine code |
| Card lane (one per card or small same-mechanic batch) | `<SET>/<ID>.ts`, `<SET>/<ID>.test.ts`, its own `import` line in `<SET>/index.ts`, its scratch ledger file | engine, shared, catalog, other cards, `docs/audits/**` |
| Engine lane (serialized, one at a time) | `apps/api/src/engine/**`, testkit, retained-red flips, `docs/audits/engine/<seam>.md` | catalog, set ledger |
| Web lane | `apps/web/**` | everything else |

Two rules make parallel lanes safe: card lanes edit only their own files,
and only one engine lane runs at a time. A card lane that hits an engine gap
keeps the test as `it.fails` with a named seam and moves on.

## Layout (from `docs/audits/README.md`)

```text
docs/audits/README.md          rules, template, generated status index (`pnpm audit:index`)
docs/audits/<SET>.md           the ONLY audit ledger for the set: Status, Gates, Card ledger,
                               Mechanisms, Knowledge base index, Open items, History
docs/audits/engine/<seam>.md   cross-set engine seams, kebab-case
```

Nothing else under `docs/audits/`: no per-card reports, RUN.md, REVIEW-NOTES,
KB-INDEX, range or batch reports, logs, PNGs or JSON.
`apps/api/src/cards/audit-docs.test.ts` enforces this. Lanes write their
evidence to the session scratchpad (an ignored path such as
`.vitest/scratch/`), and the coordinator folds it into the ledger.

## Card registration (from `AGENTS.md`)

- Executable behaviour is registered exclusively with `registerIrCard(cardId, compiled)`.
- Never add or keep a second `registerCard` registration for the same card.
  A handwritten card is ported to compiled IR or recorded as an open item
  below 10/10.
- No `// @ts-nocheck`, casts, suppressions or weakened printed requirements.

## Rubric

Five columns, each 0–2: catalog/rules, IR trace, behavioural proof,
peer/stack proof, delivery gates. Workers score at most 8 (gates are the
coordinator's). Gates credit is awarded only after the set-level gates pass
and the tree is committed. The ledger score line is
`**N/10** (c + ir + b + p + g)`; `scripts/ledger.mjs` reads and updates it.

## 1. Resume or start

1. Read `docs/audits/<SET>.md` (front matter, Status, Open items) and
   `git status`. The front matter `cards:` must equal the number of
   `<SET>-*.ts` production modules.
2. Compare the catalog with the current community source when the set is
   still being revealed:
   `node tools/import-taka-cards.mjs --source <DigimonCards.json> --validate <SET>`.
   Import newly revealed IDs with `--ids`, rebuild shared
   (`pnpm --filter @aegis/shared build`) and commit the catalog on its own.
   Record the upstream commit or fetch date in the ledger Status.
3. Measure before dispatching: run the changed card suites once with
   `--maxWorkers=1 --no-file-parallelism` and `pnpm --filter @aegis/api typecheck`.
   Never trust a prior session's claim that a red is "fixture only".
4. Write the lane brief into the scratchpad from
   `references/worker-brief.md`, filling in the set, exemplar tests and any
   engine facts already established. Every lane reads it first.

## 2. Dispatch

- Card lanes: opus, low reasoning effort. Batch 3–5 same-mechanic cards per
  lane when authoring new cards; one card per lane when re-auditing a
  finished set. Respect the machine: at most three concurrent lanes on a
  16 GB machine, each running only its own test file.
- Prompt = brief path, card ids with a one-line clause summary each, ruling
  ids, any coordinator contract, the allowed-files line, and the scratch
  ledger file the lane must write.
- Engine lane: opus, one at a time, with an explicit seam list in priority
  order, the allowed edit set, the regression command, and the
  `docs/audits/engine/<seam>.md` doc to write.
- Web lane when the set adds UI (App Fusion, new keywords).
- Prefer bounded follow-up lanes over resuming a finished agent: "fix the
  Digi-Egg fixtures in <file>", "flip the it.fails now that seam X landed".

## 3. Accept a lane result

For every card, before touching the ledger:

```bash
pnpm --filter @aegis/api exec vitest run src/cards/<SET>/<ID>.test.ts --maxWorkers=1 --no-file-parallelism
rg -n 'registerCard\(|@ts-nocheck' src/cards/<SET>/<ID>.ts
rg -n 'security:.*(BT1-00[1-8]|ST[134]-01|<SET>-00[1-4])|advance\.fire' src/cards/<SET>/<ID>.test.ts
```

Reject when: a Digi-Egg sits in security or deck, a clause is proved only
by injected timing (`advance.fire`, `fireTiming`), an evolution test asserts
`{ok:true}` without cost and stack, a once-per-turn test has no next-turn
reset, a `registerCard` registration appears, or a worker "blessed" a wrong
result with a ruling that does not say so. Send the correction back to the
same agent with the exact lines.

Then paste the lane's `### <ID> — <Name>` section into the Card ledger in
ascending ID order, list engine seams under Open items, append new fixture
traps to the brief, and forward seams to the running engine lane with
`SendMessage`.

Coordinator-owned fixes you do yourself: catalog text, `effects/data.ts`
overrides, ledger. Rebuild shared after catalog edits before re-running a
card suite.

## 4. Engine lane protocol

Each engine lane gets: the seam list, the engine docs to read, the allowed
edit set, and this gate:

```bash
pnpm --filter @aegis/api exec vitest run src/cards/<SET> src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism
pnpm typecheck
```

Require one `docs/audits/engine/<seam>.md` per seam, red-then-green proof,
and a list of pre-existing failures reproduced on a pristine
`git archive HEAD` copy in the scratchpad (never a checkout). Rules
judgements the lane cannot settle come back to you; decide from the ruling
text and record the decision under Mechanisms or Open items.

## 5. Coordinator gates

Run when a batch lands and again at closeout. Copy the exact commands and
counts into the ledger Gates section.

```bash
pnpm effects:sync:set -- --set <SET> --base <BASE-SHA>
pnpm effects:check:set -- --set <SET> --base <BASE-SHA>
pnpm typecheck
pnpm --filter @aegis/api exec vitest run src/cards/<SET> src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism
pnpm exec oxlint <changed files>; pnpm exec oxfmt --check <changed files>; git diff --check
pnpm audit:index --check
```

Run the engine suites (`src/engine/conformance src/engine/combat
src/engine/effects src/engine/cards`) only when an engine seam changed, or
once at closeout when memory allows. The sync must report zero semantic or
byte changes outside the set. Sweep `apps/api/src/cards/<SET>` for stray
probe files before the run.

## 6. Close

1. Award gates credit with `node .agents/skills/audit-card-set/scripts/ledger.mjs docs/audits/<SET>.md --gates 2`
   once the closing gates pass. Refresh the front matter (`cards`, `status`,
   `verified_at`, `catalog_commit`, `evidence_commit`), rewrite Status as one
   paragraph, and update Open items and History. Run `pnpm audit:index`.
2. Commit in dependency order, conventional messages, no attribution:
   engine, shared/catalog, cards (with the synced effects records), web,
   docs. Do not push unless asked.
3. Report: aggregate, cards at 10/10, engine seams closed and still open,
   catalog corrections, and anything that changes production behaviour.

## Incident rules

- No lane may run any git write (`stash`, `checkout --`, `restore`,
  `reset`, `worktree`). One `git stash` on the shared worktree reverted 167
  files for every concurrent lane. The alternative is `git show HEAD:<path>`.
- If it happens: stop the agent (`TaskStop`), check `git stash list` and
  `git status`, confirm no conflict markers, re-apply ledger sections written
  in the window, message every live lane to re-read its files, record it
  under Open items.
- An expired login kills background agents mid-task; their partial edits
  stay on disk. Re-dispatch with a resume note that says the partial work is
  unverified.
- Memory: vitest with the API graph takes about 1.5 GB per process. Never
  run more than three test processes at once; never run the whole
  collection from a lane.
- Disk space: the API build emits large `.map` files; check `df` before
  long runs.
