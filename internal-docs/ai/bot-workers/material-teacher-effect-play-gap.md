# Effect DigiXros teacher gap: optional free effect play

Base: feature commit `93db25fb50b0900a8ae89d4bdaab205693a13f7a`. Its `apps/api` and `packages` trees are byte-identical to frozen qualified source `1cec011c0`; only operator scripts and docs differ. The qualified engine fingerprint `9a8d2d5f22fd9a06b959de37530a52c4aff4370988101060f75990bf17da7a7e` is unchanged. No API, shared or card source is changed on this branch. This note hands off an external expert teacher for ROOT review. It contains no remote-job, weight, model or mastery evidence.

## Finding

The qualified teacher declines LordKnightmon's free effect play. That refusal is the precursor that keeps effect DigiXros labels out of the corpus.

| Step | Public request | Qualified teacher |
| --- | --- | --- |
| Digivolve into EX13-064 LordKnightmon | — | — |
| [When Digivolving] free play of a cost-8-or-lower [Knightmon] text card from hand or trash | `selectCards`, `min 0`, `max 1`, `timing: "WhenDigivolving"`, no `purpose`, no preceding `optional` prompt | `[]` (declines) |

**Cause.**

1. The compiler merges the play/use Modal into one `PlayWithoutCost` (`modal.ts` `mergedPlayOrUseAction`). That action has `optional: false` and `target.upTo: true, minimum: 0`.
2. `play.ts` therefore asks one up-to-1 pick with no prompt before it.
3. `policy.ts` `pickInstances` returns `[]` for an own `min 0` pick with no `purpose`.
4. `materialTeacherDecision` handles only requests that already carry `digiXrosCardId`, so it never runs.

**The two precursor fixtures differ.** Fixture: `bagra-effect-play-refusals.actual.json`, SHA256 `24b14f7d…7433ab`.

| Episode | Seat, fold | DeadlyAxemon (DigiXros material) | Effect DigiXros reachable? |
| --- | --- | --- | --- |
| 216 | 0, training | hand `s0-18` | Yes |
| 260 | 1, validation | trash `s1-19` only | No. The engine opens no material picker for a trash-only material; this is a plain free-play refusal |

My earlier note said "no actual seat-1 effect DigiXros precursor". That statement covered only these two fixtures. ROOT has since found an actual seat-1 effect DigiXros training row in the full closed contexts-2 collection: row 854, seed 6001734. Per ROOT, two gaps remain: seat 0 in the training fold, and both seats in the validation fold.

## Delivery: external expert teacher

All three files are new, under `tools/bot-training/operators/`.

| File | SHA256 | Role |
| --- | --- | --- |
| `material-teacher-effect-policy.mjs` | `648d8a2623a09a5392e9fa4d289da62cdb4414cc0b3781e6d194395f47685266` | Expert decorator around the qualified `createTrainingTeacher` |
| `material-teacher-effect-entry.mjs` | `180cfa31cedd3c8025debc0b673a74c5ddecf22799d5857dac65f428ee14682f` | External worker for `collect.py --worker` |
| `material-teacher-effect.test.mjs` | `bad984792dc9ed3d3e001ea82a8c99c1a978413fe50d9ac92b7d90a3cc4a64b9` | `node:test` guards |

### Entry

The entry is a line-for-line copy of the qualified compiled `dist/bot/training/cli.js`, which compiles from `cli.ts` (SHA256 `2140c324…2a96`). It differs in only three ways:

1. It loads every module by absolute path from `/home/vinicius/aegis-bot-lab/checkouts/material-teacher-1cec011c0/apps/api/dist`.
2. It statically imports its sibling `./material-teacher-effect-policy.mjs`.
3. It passes the expert factory where `cli.js` passes `createTrainingTeacher`.

There is no loader, no source transform and no metadata change. `--describe` and `--describe-curriculum` come from the qualified `metadata.ts` and `curriculum.ts`, so they are the qualified worker's own bytes.

`AEGIS_QUALIFIED_ROOT` exists only for local synthetic tests. It must be absolute; an empty or relative value fails loudly instead of resolving against the working directory. ROOT's adapter rejects any presence of it in production.

**Import surface:**

- **Entry:** node builtins, the qualified dist, and the sibling policy file.
- **Policy:** node builtins and qualified-dist files only. It reaches `@aegis/shared` through the checkout's own `apps/api/node_modules` link, resolved by realpath.
- **What binds them:** every qualified module either file imports is covered by the qualified `engineSha256`, which hashes the engine, cards, bot, shared dist and the lockfile. The policy file is not covered by it, so ROOT must pin it next to the entry.

### What the expert changes

The expert overrides only one decision. Every other request returns the qualified teacher's answer unchanged. That includes the DigiXros material picker that opens next, so the qualified `materialTeacherDecision` still chooses the physical material. The fixed opponent is untouched.

An override needs all of the following:

1. **Source binding.** `sourceCardId` is `EX13-064` (allowlist). `sourceInstanceId` and `sourcePermanentId` match the learner's own public board top card (`top.instanceId`, `top.cardId`, `top.ownerSeat`). The unit is not in breeding.
2. **Request shape.** `selectCards` for the learner's seat, and the current `pendingDecision`. `min 0`, `max 1`, `timing "WhenDigivolving"`. No option outside the permitted set: candidates, visible cards, `min`, `max`, `differentColors`, `timing`, `effectText`, `effectTextPart`. `effectText` may be present but is never read. Any `purpose`, `isInherited`, material, budget, `targetFate` or other option rejects the request.
3. **Compiled IR.** EX13-064 has exactly one non-inherited, non-linked, non-security [When Digivolving] effect with no whole-effect optional, cost or condition. Its single Modal, merged by the engine's own `mergedPlayOrUseAction`, deep-equals the pinned `QUALIFIED_PLAY_ACTION`. Any other filter shape is rejected.
4. **Candidate pool.** Every offered id is unique and is an own physical hand or trash card owned by the learner. None is an Option. The engine's `definitionMatches` accepts each one against the pinned filter, which includes the `[Knightmon]` text gate.
5. **Material proof.** The chosen candidate is DarkKnightmon (`EX10-031`, allowlist). One current own-hand card, owned by the learner and different from the candidate, satisfies its recipe according to the engine's `materialsSatisfyRecipe`.
6. **Ranking.** The qualified `scoreCandidate` scores a zero-cost `playDigimon` with `DEFAULT_BOT_PROFILE`. The highest positive score wins; offer order breaks ties.

As a result, plain free plays get no new label, and the episode 260 layout delegates unchanged.

### Source-context limitation

The decision protocol and the training observation project no "gained" or "linked" flag; only `isInherited` and `timing` are public. So the rejection rests on these facts:

- **Identity binding.** The allowlist, the three-way top-card binding and `isInherited` must all hold.
- **Grants.** In the qualified pool, no card grants a [When Digivolving] effect. The runtime IR has no `GainTriggeredEffect` or `GainEffect` with that timing, `GRANTED_EFFECT_LIBRARY` has none, and no `copyTrigger` names it. A test asserts this.
- **EX13-064's own IR.** It holds no `ActivateForeignEffect`, `ActivateEffect`, `ReactivateEffect`, `Gain*Effect` or `GrantStatic`. A test asserts this.
- **Re-run routes.** Re-activation routes such as `ActivateEffect`, `ReactivateEffect` and lender-source `ActivateForeignEffect` re-run LordKnightmon's own printed clause, so the label stays correct. Routes run "as an effect of this Digimon" use the activator as source, so they fail the EX13-064 binding.
- **Security and stack cards.** Security effects have no permanent, and a stack-held lender's instance is not the top card, so both fail the binding.

If a later card pool adds a [When Digivolving] grant, the pool test fails and this admission must be reviewed again.

## Local verification (synthetic only)

I ran `node --test --test-concurrency=1 tools/bot-training/operators/material-teacher-effect.test.mjs` with Node 26.10.0 against this checkout's qualified-equivalent dist. There was no Vitest and no overlapping run. **20 of 20 tests pass:**

- **Metadata parity.** The entry's `--describe` and `--describe-curriculum` are byte-identical to the qualified `cli.js`.
- **Override handling.** Without the override, the entry loads only the exact production path; that path does not exist here, so it fails loudly. An empty or relative override is refused.
- **Episode replay.** A 40-decision teacher-following episode (seed 6101) produces a byte-identical JSONL transcript under the entry and under the qualified worker.
- **Actual fixture, read-only.** The bytes match their pin. Episode 216 yields exactly `s0-22` DarkKnightmon. Episode 260 yields no candidate, so it delegates.
- **Synthetic EX13-064 route, both seats.** The qualified teacher and the fixed opponent refuse. The expert picks DarkKnightmon. The material request carries `digiXrosCardId: EX10-031`, and the expert's answer equals the qualified teacher's (DeadlyAxemon). The physical stack becomes `[DeadlyAxemon]`.
- **Delegation, both seats.** The answer is unchanged for a trash-only material, a plain free play, and a pool holding an Option. 15 request variants are rejected, covering the source-card, source-instance and source-permanent bindings plus filter, foreign-card, board-id, duplicate and unsafe-option cases. Tampered IR (filter, extra effect, inherited) is rejected. A foreign-owned hand material is rejected. Stale, foreign-seat and `purpose` requests delegate.
- **Card pool.** No grant or copy route for [When Digivolving], and no foreign-effect route in EX13-064.

The metadata parity proves source metadata only. It is not proof of an actual qualified run, the primary policy, the model or mastery.

**Fingerprint note.** The earlier local `engineSha256` `cc00dc7c…` came from my leftover prototype `.local` outputs in `apps/api/dist`. `metadata.ts` hashes every compiled bot, engine and cards JS file. After I deleted those outputs, without rebuilding, the qualified `cli.js --describe` here reports `9a8d2d5f…7a7e`.

## Corrections to the previous version of this note

- **Metadata.** It said `collect.py` copies only `engineSha256`. That was wrong: `collect.py` stores the full describe output as `manifest["metadata"]`. The expert entry therefore must not add fields, and it no longer does. The earlier `expertTeacher` describe field belonged only to a superseded local prototype.
- **Fallback history.** The typed-purpose API fallback was a local five-file source edit. I tested it, saved it as an ignored patch, and restored the original bytes. Its diff was committed only as text inside this note (commit `4c3a228d1`) and removed in `5a8e6df96`. No API, shared or card source was ever committed or pushed, and the API tree on this branch is unchanged. It stays a fallback that would need a new qualified source; it is not part of this delivery.
- **Superseded prototypes.** The ignored `apps/api/src/bot/training/effectPlayExpert*.local.*` prototypes are superseded by the operator files above. Their compiled outputs were removed from `dist`.

## Notes for ROOT's admission adapter

From a read-only review of `material-teacher-effect-learning.py` at `2336825ab`:

- **Pin the helper module (material).** The adapter should require the exact module set `{material-teacher-effect-entry.mjs (entry), material-teacher-effect-policy.mjs}`, both pinned. As written, it accepts 1–3 modules and would admit an unpinned sibling policy.
- **Hash what you execute (minor).** `original()` and `namespace()` should compile the same buffer they hash.
- **Confirmed.** The `AEGIS_QUALIFIED_ROOT` presence check reaches worker children, because the original `subprocess.run` passes `env={**os.environ, …}`.
