# Shared name-alias and route-name mechanism (lane S)

Four BT17 re-audit seams that all live in `packages/shared` (or in the readers that consume it).
Scope: BT17-019, BT17-078, BT17-085, and the BT17-011 / BT17-012 / BT17-023 route-name check.

---

## 1. An "in its name" alias was treated as a full name (BT17-085, Q2868)

### What was wrong

`packages/shared/src/cards/effectiveNames.ts`, `parsedStaticNameAliases`, matched an
"also treated ..." phrase and harvested **every** bracketed `[X]` in it as a full-name alias.
EX4-030 Kuzuhamon prints:

> This card/Digimon is also treated as having **[Sakuyamon] in its name**.

so `effectiveStaticNames("EX4-030")` returned `["Kuzuhamon", "Sakuyamon"]`. Both the exact and
the substring name gates then read the same list, and `match: "nameExact"` accepted Kuzuhamon as
a `[Sakuyamon]`.

### Ruling

KB **Q2868**: a card treated as having `[X]` *in its name* answers a "with `[X]` in its name"
gate only. It is never treated as *having the name* `[X]`, so an exact-name route must refuse it.
The same distinction is already stated for real names by Q1231/Q1232 ("Cerberusmon: Werewolf
Mode" is not a "Cerberusmon").

### Fix

Split the alias output into two channels in `effectiveNames.ts`:

| Printed wording | Channel | Answers |
| --- | --- | --- |
| "also treated as [X]", "as if its name is [X]", "(Rule) Name: Also treated as [X]" | `exact` | `nameExact` / `namesExact` **and** substring gates |
| "treated as **having** [X]", "[X] **in its name**" | `substring` | substring gates only |

New exports:

- `effectiveExactNames(def)` — printed `nameEn` + the static alias table + the `exact` channel.
- `effectiveSubstringOnlyNames(def)` — the `substring` channel.
- `effectiveStaticNames(def)` — unchanged meaning (the union), so every existing caller keeps
  its current behaviour.

Readers switched to the exact channel:

- `apps/api/src/engine/effects/interpreter/matching/definition.ts` — `match: "nameExact"` now
  compares against a separate `exactNames` array; `match: "name"` still reads the union.
- `apps/api/src/engine/cards/cardData.ts` — `matchGatedRequirement`'s `req.namesExact` gate
  now calls `effectiveExactNames(baseDef)` instead of the union (`baseEffectiveNames`).

### Effect on the alias table (verified against the whole catalog)

Aliases that moved to substring-only: EX4-030 `[Sakuyamon]`, EX12-041 `[Mamemon]`, P-141
`[Mamemon]`/`[Tyrannomon]`, EX5-030 and BT14-052 `[Leomon]`, EX5-046 `[Etemon]`/`[Sukamon]`,
BT22-014 `[Greymon]`, BT9-068 `[Greymon]`, BT11-054 `[Leomon]`, BT14-097 `[Sukamon]`, EX4-048
`[Greymon]`, EX4-072 `[Plug-In]`. Aliases that stay exact: BT11-009, BT15-012, BT15-035,
BT16-086, BT17-091, BT18-088, BT19-102, EX3-064, EX11-053, EX11-066, EX2-012, EX4-026, EX4-028,
EX4-033, EX4-062, BT8-061, BT8-062, BT10-061, BT10-111, BT11-015, BT11-018, BT11-030, BT11-063,
BT11-071, LM-026, P-147, P-152, EX5-070, and every card in
`STATIC_NAME_ALIASES_BY_CARD_ID`. **Cards outside BT17 are affected**: any exact-name route or
`namesExact` gate that used to accept the cards in the first list now refuses them. That is the
Q2868 ruling, not a regression — the shared suite (438 tests) and the BT17 / engine-cards /
matching gate are green on it.

### Red then green

```
# red (before the fix)
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-085.test.ts --maxWorkers=1 --no-file-parallelism
  -> 7 passed | 1 expected fail (8)      # it.fails: Renamon digivolved into EX4-030
# green (after the fix, name gate only)
  -> the exact route refuses EX4-030: perm("renamon").topCard stays BT17-031
```

The `it.fails` on BT17-085 is **retained** for a second, unrelated seam — see section 5.

---

## 2. The spurious `"Rule"` alias (REVIEW-NOTES "Shared bug (lane 63)")

### What was wrong

The `(Rule) Name:` regex matched the whole phrase **including** the leading marker. For the
square-bracket printing `[Rule] Name: ...` the subsequent `\[([^\]]+)\]` bracket scan harvested
`Rule` itself, so EX12-041, BT15-012, BT15-035, BT17-091, BT18-088, EX11-053 and P-141 all
carried a name alias `"Rule"`. Harmless in practice (no card is named "Rule") but real.

### Fix

The regex now captures only the tail after `Name:` and the bracket scan runs on that capture:

```ts
[...text.matchAll(/[[(]Rule[\])]\s*Name:\s*((?:Also\s+)?[Tt]reated as(?:\s+having)?[^.。]*)/g)]
  .map((match) => match[1]!)
```

### Verification

```
node -e '... effectiveStaticNames for EX12-041, BT15-012, P-141, EX5-030, EX11-066 ...'
  before: EX12-041 -> ["Thundermon","Rule","Mamemon"]
  after:  EX12-041 -> ["Thundermon","Mamemon"]  (exact ["Thundermon"], substring ["Mamemon"])
```

`packages/shared/src/cards/effectiveNames.test.ts` (the `[Rule] Name` cases) stays green.

---

## 3. BT17-078 DNA recipe stored as a substring gate

### What was wrong

`DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES["BT17-078"]` in `packages/shared/src/effects/data.ts`
stored the printed `＜Blast DNA Digivolve＞` recipe as substring `names`:

```ts
materials: [{ names: ["WarGreymon"] }, { names: ["MetalGarurumon"] }]
```

`dnaMaterialSpecMatches` (`apps/api/src/engine/effects/primitives.ts`) treats `names` as
`includes`, so BlackWarGreymon (BT2-112) and the X-Antibody variants were admitted as cost-0
Blast DNA materials.

### Ruling

Printed brackets with no "in its name" qualifier are exact names. BT13-059 in the same file is
the precedent, and its comment already says the substring gate "would incorrectly admit name
extensions as DNA materials".

### Fix

```ts
materials: [{ namesExact: ["WarGreymon"] }, { namesExact: ["MetalGarurumon"] }]
```

### Red then green

```
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-078.test.ts --maxWorkers=1 --no-file-parallelism
  before: 7 passed | 1 expected fail (8)   # it.fails "rejects a near-name (BlackWarGreymon)"
  after:  8 passed (8)                     # it.fails flipped to it
```

---

## 4. Route-name `namesExact` runtime check (BT17-011, BT17-012, BT17-023)

REVIEW-NOTES asked whether these modules need an `ALTERNATE_DIGIVOLUTION_OVERRIDES` entry for
the runtime to honour `namesExact`, as BT18-101 does.

### Finding: no override is needed. The runtime is already exact.

1. The synced `packages/shared/src/effects/effects.json` records persist the exactness:

   | Card | Persisted `digivolutionRequirement` |
   | --- | --- |
   | BT17-011 | `[{namesExact:["Takuya Kanbara"],cost:2,isAlternate,baseIsTamer},{namesExact:["BurningGreymon"],cost:1,isAlternate}]` |
   | BT17-012 | `[{namesExact:["Takuya Kanbara"],cost:2,isAlternate,baseIsTamer},{namesExact:["Agunimon"],cost:1,isAlternate}]` |
   | BT17-023 | `[{namesExact:["Koji Minamoto"],cost:2,isAlternate,baseIsTamer},{namesExact:["Lobomon"],cost:1,isAlternate}]` |

2. Nothing shadows them: `digivolutionRequirementsFor` resolves
   `ALTERNATE_DIGIVOLUTION_OVERRIDES` -> `GENERATED_DIGIVOLUTION_OVERRIDES` ->
   `effects.json`, and neither override table holds a BT17-011 / -012 / -023 key.

3. The runtime matcher honours the field: `matchGatedRequirement`
   (`apps/api/src/engine/cards/cardData.ts`) applies `req.namesExact` as an equality gate,
   distinct from the `req.names` `includes` gate above it.

BT18-101 needed its override only because *its* generated record still held a substring `names`
gate; that is not the case here.

### Side fix made while confirming it

`matchGatedRequirement` fed `namesExact` from `effectiveStaticNames(baseDef)` — the alias
**union**. That is the same Q2868 defect in a second reader: EX4-030 would have satisfied an
exact `[Sakuyamon]` route. It now reads `effectiveExactNames(baseDef)` (section 1).

### Known twin not fixed here

`apps/web/src/game/boardModel.ts:644` runs the client-side highlighting version of the same gate
and still reads `effectiveStaticNames`. `apps/web` is outside this lane's allowed edits, so
server legality and client highlighting can now disagree for the twelve substring-only alias
cards listed in section 1. **Coordinator follow-up:** switch that call to `effectiveExactNames`.

---

## 5. BT17-085's retained red is now a different seam

After section 1 the exact-name route correctly refuses EX4-030, but
`it.fails("refuses EX4-030 Kuzuhamon ... (Q2868)")` stays red on a **cost-gating** seam:

- File/function: `apps/api/src/engine/effects/interpreter/effect.ts`, `canActivateEffect` ->
  `intrinsicPossible`. `CostGatedBlock` is not in the gated-action set, so the block's inner
  `Digivolve` is never preflighted.
- Expected: with no legal `[Sakuyamon]` the `[Main]` effect cannot be activated — Renamon's
  `stack` stays empty, hand stays `["EX4-030"]`, memory stays 4.
- Actual: the effect activates, the compound place cost is paid, then the digivolve fizzles:
  `stack` is `["BT17-035", "BT17-032", "BT17-085"]` (Taomon, Kyubimon, Rika), hand `["EX4-030"]`,
  memory 4, only one `optional` decision raised.
- Same family as the Q2803 / Q2804 pay-then-may seam (REVIEW-NOTES priority 4). Owned by the
  engine lane (`apps/api/src/engine/effects/**`).

---

## 6. BT17-019's 15 s timeout is leaked from BT17-085.test.ts

The restart checkpoint (`logs/restart-checkpoint-collection.log`) shows
`BT17-019.test.ts > treats [Matt Ishida] as a substring of the Tamer name` timing out at 15 s.

### What it is not

- Not a BT17-019 fixture or IR defect: the file passes alone in ~0.4 s
  (`vitest run src/cards/BT17/BT17-019.test.ts` -> 10 passed).
- Not an unanswered Decision *in BT17-019*: instrumenting the harness showed `s.decisions`
  empty at the hang.
- Not an effect loop: tracing `TurnStateMachine.runTurn` showed the end-turn postponement loop
  running once, `closeTurn` completing and `engine.runOneTurn()` resolving.
- Not BT17-085's module registration: importing `BT17-085.test.ts` while skipping its tests
  (`--testNamePattern "substring of the Tamer name"`) passes.

### What it is

`BT17-085.test.ts:179`, `it("does not treat an unrelated Digimon as Sakuyamon for the named
evolution")`, activates Rika's `[Main]` effect and then asserts **synchronously** — no
automation flags on `setupEngine`, no `settle`, no `respondDecision`. The activation raises an
`optional` decision that nobody ever answers, so the test finishes while an engine resolution is
still in flight. That orphaned resolution keeps churning microtasks in the same worker, and the
next file's `advance.waitForMainPhase` — which polls on microtasks by design — is starved and
never observes its Main window. BT17-019 is simply the next file that drives a turn loop.

### Isolation

```
# both files, only the two tests that matter, one worker
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-019.test.ts src/cards/BT17/BT17-085.test.ts \
  --maxWorkers=1 --no-file-parallelism --testNamePattern "substring of the Tamer name|<085 test>"

  <085 test> = "does not treat an unrelated Digimon as Sakuyamon"  -> 1 timeout   (RED)
  <085 test> = "Kuzuhamon"                                          -> 0 timeouts
  <085 test> = "honors declining"                                   -> 0 timeouts
  <085 test> = "naturally places this Tamer"                        -> 0 timeouts
  <085 test> = "naturally plays itself"                             -> 0 timeouts
  <085 test> = "naturally gains memory"                             -> 0 timeouts
  <085 test> = "traces the start-memory"                            -> 0 timeouts
```

It is order-dependent: the leak only bites a file that runs *after* `BT17-085.test.ts` in the
same worker, which is why the full `src/cards/BT17` gate happened to pass BT17-019 while the
narrower four-target run did not.

### Fix (not lane S's to make)

`BT17-085.test.ts:179` must settle its own activation before asserting — either
`{ autoDeclineOptional: true }` on `setupEngine` plus a `settle`, or an explicit
`respondDecision` declining the prompt, followed by `assertNoLoudGap(s)`. Lane S's allowance on
that file is "flip `it.fails` only, assertions untouched", so the change is left to the card
lane / coordinator. No change was made to `BT17-019.ts` or `BT17-019.test.ts`.

---

## 7. Client twin (lane WEB)

`apps/web/src/game/boardModel.ts`, `altRequirementMatches` — the client-side twin of
`matchGatedRequirement`. Before: one `baseNames = effectiveStaticNames(baseDef)` fed both gates.
Now (lines 638-650) the substring gate keeps `effectiveStaticNames` (the union) and the exact
gate reads a new `baseExactNames = effectiveExactNames(baseDef)`, so client highlighting and
server legality agree on the twelve substring-only alias cards.

`apps/web/src` holds no other exact-name reader of the alias union. The remaining name readers
are substring or printed-name reads and were left alone: `boardModel.ts:94` (DigiXros spec) and
`boardModel.ts:673` (`minNameStackNames`) match on `def.nameEn`, `boardModel.ts:742` compares the
hand card's own printed `nameEn`, and everything else (`overlays.tsx`, `cardLibrary.tsx`, …)
uses `nameEn` for display.

### Red then green

`apps/web/src/game/boardModel.test.ts`, new describe
"exact vs substring name gates on digivolution routes (Q2868)":

- `effectiveExactNames("EX4-030")` is `["Kuzuhamon"]` while the union also carries `Sakuyamon`.
- LM-023's substring `names: ["Sakuyamon"]` route is still offered onto EX4-030 (cost 1).
- An exact route refuses a base that carries the alias only in its name: EX9-018
  (`namesExact: ["Mamemon"]`) onto EX12-041 Thundermon offers nothing, and still fires onto a
  real [Mamemon] (BT6-064). No card prints an exact `[Sakuyamon]` route, so EX9-018/EX12-041 —
  the same substring-only alias class — carries the exact half.

```
pnpm --filter @aegis/web exec vitest run src/game/boardModel.test.ts --maxWorkers=1 --no-file-parallelism
  before (gate on the union): 1 failed | 93 passed (94)
  after  (gate on the exact channel): 94 passed (94)
pnpm --filter @aegis/web typecheck   -> clean
oxlint / oxfmt --check / git diff --check on both files -> clean
```
