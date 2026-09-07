---
name: audit-card-set
description: Re-audit a whole card set (for example BT23) with an evidence ledger, one coordinator and parallel opus subagent lanes. Use when asked to audit, re-audit or continue the audit of a set or collection, to score cards against catalog, rulings and behavioural proof, or to resume a set audit from its RUN.md and ledger.
---

# Audit Card Set

The coordinator orchestrates; opus subagents do the card and engine work.
Each card is scored in an evidence ledger and only observable behaviour
counts. Per-card technique lives in the `verify-card-implementation` skill;
this skill is the set-level protocol around it.

## Roles

| Role | Owns | Never touches |
| --- | --- | --- |
| Coordinator (you) | ledger, RUN.md, REVIEW-NOTES.md, catalog JSON, effects sync, shared data overrides, gates, commits | card modules, engine code |
| Card lane (one per card) | `<SET>/<ID>.ts`, `<SET>/<ID>.test.ts`, report `<ID>.md` | engine, shared, catalog, other cards, ledger |
| Engine lane (serialized, one at a time) | `apps/api/src/engine/**`, testkit, retained-red flips | catalog, ledger, notes |
| Web lane | `apps/web/**` | everything else |

Two rules make parallel lanes safe: card lanes edit only their three files,
and only one engine lane runs at a time. A card lane that hits an engine gap
keeps the test as `it.fails` with a named seam and moves on.

## Layout

```text
docs/audits/<SET>-REAUDIT-LEDGER.md        one row per card, rubric columns
docs/audits/<SET>-reaudit/RUN.md           command and result log, checkpoints
docs/audits/<SET>-reaudit/REVIEW-NOTES.md  coordinator decisions, seam queue
docs/audits/<SET>-reaudit/KB-INDEX.md      Q&A ids per card (never claim "no rulings" without it)
docs/audits/<SET>-reaudit/SOURCE-RECONCILIATION.md  catalog corrections vs official list
docs/audits/<SET>-reaudit/<ID>.md          per-card evidence report
docs/audits/<SET>-reaudit/*-MECHANISM.md   one doc per engine seam
docs/audits/<SET>-reaudit/logs/            command logs (untracked)
```

`docs/audits/*` is gitignored; reports are committed with `git add -f`.
Logs stay untracked.

## Rubric

Five columns, each 0–2: catalog/rules, IR trace, behavioural proof,
peer/stack proof, delivery gates. Workers score at most 8 (gates are the
coordinator's). Gates credit is given only after the set-level gates pass;
2/2 needs the tree committed and the PR updated.

## 1. Resume or start

1. Read RUN.md tail, REVIEW-NOTES.md headings, the ledger header, and
   `git status`. Note which rows are `Queued`, which reports exist.
2. Measure before dispatching: run the changed card suites, `pnpm typecheck`,
   and record the result in RUN.md as a restart checkpoint. Never trust a
   prior session's claims that a red is "fixture only".
3. Confirm the ledger row count equals the catalog card count.
4. Write the lane brief into the session scratchpad from
   `references/worker-brief.md`, filling in the set, exemplar tests and any
   engine facts already established. Every lane reads it first.

## 2. Dispatch

- Card lanes: opus, one card each, six to nine concurrent. Prompt = brief
  path, card id, ruling ids, any coordinator contract for that card, and the
  allowed-files line. Re-dispatch the next card as soon as one reports.
- Engine lane: opus, one at a time, with an explicit seam list in priority
  order, the allowed edit set, the regression command, and the doc to write.
- Web lane when the set adds UI (App Fusion, new keywords).
- Prefer bounded follow-up lanes over resuming a finished agent: "fix the
  Digi-Egg fixtures in <file>", "flip the it.fails now that seam X landed".

## 3. Accept a lane result

For every card report, before touching the ledger:

```bash
pnpm --filter @aegis/api exec vitest run src/cards/<SET>/<ID>.test.ts --maxWorkers=1 --no-file-parallelism
rg -n 'security:.*(BT1-00[1-8]|ST[134]-01|<SET>-00[1-4])|advance\.fire' src/cards/<SET>/<ID>.test.ts
```

Reject when: a Digi-Egg sits in security or deck, a clause is proved only
by injected timing (`advance.fire`, `fireTiming`), an evolution test asserts
`{ok:true}` without cost and stack, a once-per-turn test has no next-turn
reset, or a worker "blessed" a wrong result with a ruling that does not say
so. Send the correction back to the same agent with the exact lines.

Then update the row with `scripts/ledger.mjs`, add engine seams the lane
found to REVIEW-NOTES.md, append new fixture traps to the brief, and forward
seams to the running engine lane with `SendMessage`.

Coordinator-owned fixes you do yourself: catalog text, `effects/data.ts`
overrides, ledger, notes. Rebuild shared after catalog edits
(`pnpm --filter @aegis/shared build`) before re-running a card suite.

## 4. Engine lane protocol

Each engine lane gets: the seam list, the mechanism docs to read, the
allowed edit set, and this gate:

```bash
pnpm --filter @aegis/api exec vitest run src/cards/<SET> src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism
pnpm typecheck
```

Require a mechanism doc per seam, red-then-green proof, and a list of
pre-existing failures reproduced on a pristine `git archive HEAD` copy in
the scratchpad (never a checkout). Rules judgements the lane cannot settle
come back to you; decide from the ruling text and record the decision in
REVIEW-NOTES.md.

## 5. Coordinator gates

Run when a batch lands and again at closeout:

```bash
pnpm effects:sync:set -- --set <SET> --base <BASE-SHA>
pnpm effects:check:set -- --set <SET> --base <BASE-SHA>
pnpm typecheck
pnpm --filter @aegis/api exec vitest run src/cards/<SET> src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism
pnpm exec oxlint <changed files>; pnpm exec oxfmt --check <changed files>; git diff --check
```

The sync must report zero semantic or byte changes outside the set. Sweep
`apps/api/src/cards/<SET>` for stray probe files before the run.

## 6. Close

1. Award gates credit with `scripts/gates.mjs` once the closing gates pass,
   refresh the ledger header, and append a closeout paragraph to RUN.md with
   every command and count.
2. Commit in dependency order, conventional messages, no attribution:
   engine, shared, cards (with the synced effects records), web, docs
   (`git add -f` for reports). Do not push unless asked.
3. Report: aggregate, cards at 10/10, engine seams closed and still open,
   catalog corrections, and anything that changes production behaviour.

## Incident rules

- No lane may run any git write (`stash`, `checkout --`, `restore`,
  `reset`, `worktree`). One `git stash` on the shared worktree reverted 167
  files for every concurrent lane. The alternative is `git show HEAD:<path>`.
- If it happens: stop the agent (`TaskStop`), check `git stash list` and
  `git status`, confirm no conflict markers, re-apply ledger rows written in
  the window, message every live lane to re-read its files, log it in
  RUN.md.
- An expired login kills background agents mid-task; their partial edits
  stay on disk. Re-dispatch with a resume note that says the partial work is
  unverified.
- Disk space: the API build emits large `.map` files; check `df` before
  long runs.
