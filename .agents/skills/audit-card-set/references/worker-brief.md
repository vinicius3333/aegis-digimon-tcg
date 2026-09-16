# Card-lane brief template

Copy to the session scratchpad (an ignored path inside the worktree such as
`.vitest/scratch/brief.md`), replace `<SET>`, `<BASE-SHA>`, the exemplar list
and the lane batch, and point every lane at it.

---

# <SET> worker brief (card-only lane)

Repository: the current git worktree; run everything from it. English only.
Keep reasoning effort low and be economical with tokens and memory.

## Goal

Author or independently re-audit the assigned cards and produce evidence for
the ledger rubric: catalog/rules, IR trace, behavioural proof, peer/stack
proof (0–2 each) and delivery gates (always 0 for workers). Score honestly;
a worker claims at most 8/10.

## Hard rules (AGENTS.md)

- Register behaviour only with `registerIrCard(cardId, compiled)` from
  `../../engine/effects/interpreter.js`. Never `registerCard`, never
  `// @ts-nocheck`, casts or suppressions.
- Target `coverage: "full"` and `residual: []`. A clause the engine cannot
  express stays as an `it.fails` test with a comment naming the seam (file,
  function, expected versus actual). Do not weaken the assertion or bless a
  wrong result with a ruling that does not say so.
- Never write under `docs/audits/`. The set ledger belongs to the coordinator.

## Sources of truth

- Catalog: `packages/shared/src/cards/data/cards.json`. Official text wins;
  if the catalog disagrees with the official list, report it, do not edit.
- Rulings: `node tools/kb/query.mjs card <ID>` and
  `node tools/kb/query.mjs rules "<phrase>"`; `data/kb/rules/comprehensive.md`
  is authoritative. When the card query returns nothing, write
  "No card-specific KB entries in the current local index (queried <date>)".
- Module and test: `apps/api/src/cards/<SET>/<ID>.ts` and `<ID>.test.ts`.
- Context: the Mechanisms and Open items sections of `docs/audits/<SET>.md`
  that mention your card; `docs/audits/engine/<seam>.md` for named seams.
- Exemplar tests in the accepted style: <list three or four>. Reuse their
  helpers: public intents, `ready()`, `startTurnLoop()`, `endPhase`,
  `observe(...)`, decision automation flags. Injected timing
  (`advance.fire`, `fireSubTrigger`, `fireTiming`) is structural only and
  earns no behavioural credit.
- Vocabulary: `packages/shared/src/effects/ir/` and
  `apps/api/src/engine/effects/interpreter.ts`. Before inventing a field,
  find a card with the same printed phrasing
  (`rg -n "<phrase>" apps/api/src/cards -l`) and copy its encoding.

## Evidence standards

- Every printed clause: a behavioural test with exact endpoints (instance ids
  in zones, memory, DP, security order and faces, hand size, no pending or
  rejected action), asserted after all asynchronous effects settle.
- Every listed Q&A id: a test or a documented reason it is untestable.
- Evolution: public legal routes (normal, alternate, DNA, Assembly, App
  Fusion) with source-stack identity, cost and bonus draw, plus an
  illegal-source negative. `useAlternateCost: true` selects a reduced route;
  `{ok:true}` alone proves nothing.
- Once per turn: same-turn refusal and next-own-turn reset through the real
  turn loop, intermediate state asserted.
- Fixtures: no Digi-Egg in security or deck and no numeric `security: <n>`
  form; use inert main-deck Digimon (BT1-009..BT1-014). No inert Digimon
  exists below 3000 DP, so a Lv3 host that must survive a check needs
  `dp: 20_000`. Keep a spare playable card in hand or Main auto-passes.
- Names and traits: `[Name]` is exact (`nameExact` / `namesExact`); only
  "w/[Name] in name" is substring. "with the [X] trait" is exact
  (`match: "trait"`); "with [X] in any of its traits" is substring
  (`traitContains`). "[X] in its text" is `match: "text"` (see
  `printedTextOnly`). Trait substring is case-insensitive.
- Zones: `youHave`/`opponentHas` counting filters need `zone: "battleArea"`
  (they also count breeding); permanent targeting already defaults to the
  battle area. "This Digimon would leave" replacements need
  `isSelfRef: true`. "By opponent effects" restrictions need
  `byOpponentEffectsOnly`. Costs that place own digivolution cards need
  `shedOwnCards: true`.
- Durations: every `duration:` string must be a real `EffectDurationRef`;
  unknown strings silently expire at each turn end.
- Decisions: effect-driven digivolves with two matching routes and two-option
  costs raise `chooseOption`; use `autoChooseOption` or `preferOptionIndex`.
- `Permanent.stack` holds only the cards beneath the top card.

## Allowed edits

Only `<SET>/<ID>.ts`, `<SET>/<ID>.test.ts`, your own `import "./<ID>.js";`
line in `<SET>/index.ts` (ascending order, inserted right after the
preceding existing ID with the Edit tool so concurrent lanes do not collide)
and your scratch ledger file. Never: engine, shared, catalog, other cards,
`docs/audits/**`, scratch test files inside `apps/api`. Never any git write,
including `git stash` in any form; use `git show HEAD:<path>` into the
scratchpad.

## Commands (memory budget: 16 GB shared by up to three lanes)

```bash
pnpm --filter @aegis/api exec vitest run src/cards/<SET>/<ID>.test.ts --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api typecheck          # at most once, at the end
pnpm exec oxlint <files>; pnpm exec oxfmt --write <files>
```

Run only your own test file, one at a time. Never the whole set, the engine
suites, the workspace typecheck or `pnpm effects:sync:set`.

## Ledger output (`.vitest/scratch/ledger-<lane>.md`)

One section per card in the exact format of `docs/audits/<SET>.md`:

```markdown
### <ID> — <Name>

Catalog: <kind>; colors <...>; level <n>; play cost <n>; DP <n>; traits <...>.

Printed contract: <printed text on one line>

Inherited contract: <text or "None"> (Security contract for Tamers and Options)

Trace: `apps/api/src/cards/<SET>/<ID>.ts`; exclusively `registerIrCard`; action vocabulary `<kinds>`. Proof: `apps/api/src/cards/<SET>/<ID>.test.ts` includes "<test name>"; "<test name>"; ...

<KB line>. **N/10** (c + ir + b + p + 0). <ambiguities, retained reds with seam names>
```

## Final message

Per card: score breakdown, test result line (files/tests passed), retained
reds with seam names, catalog discrepancies, anything the coordinator must
do. Under 40 lines.
