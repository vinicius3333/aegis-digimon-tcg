# ST7 collection audit — ST7-12 through ST7-01

Scope: the committed ST7 catalog, local KB, compiled IR, direct TypeScript modules, and colocated behavioral tests. The catalog contains ST7-01 through ST7-12; there is no committed `ST7-001` spelling. Cards were audited in descending order through ST7-01.

Evidence hashes at audit time: catalog `dac8e0780dd3`, compiled IR `bf96108c3ccb`, and ST7 index `1fbc6b309238`. KB queries used the canonical catalog IDs. The KB has Q&A for ST7-02, ST7-03, ST7-05, ST7-06, ST7-08, ST7-09, and ST7-12; no errata or banlist entry was found for ST7. No KB entry is available for ST7-01, ST7-04, ST7-07, ST7-10, or ST7-11.

Runtime rubric: no card is 10/10. Focused Vitest and typecheck are **not verified** because dependencies could not be installed: the supplied `/home/vinicius/.local/bin/pnpm` wrapper expands to `corepack pnpm ""`; the functional Corepack invocation then failed to install from the read-only default store and the `/tmp` store had registry `EAI_AGAIN` failures. `corepack pnpm --filter @aegis/shared run build` ended with `tsc: not found`; serial low-memory Vitest from `apps/api` ended with `Command "vitest" not found`.

| Card | Clauses and evidence | Changes/tests | Score |
| --- | --- | --- | --- |
| ST7-12 Atomic Blaster | Main selects opponent Digimon, total DP ≤8000, deletes selected cards; Security activates Main. IR is full. KB Q692–Q694 confirms any number, fewer-than-maximum selection, minimum one valid ≤8000 target, and no mid-resolution re-selection. | Corrected candidate boundary and removed silent partial acceptance of over-cap responses. Added over-8000 response test; existing Main and Security tests retained. | 9/10 — runtime not verified |
| ST7-11 Lightning Joust | Main gives one own Digimon +2000 for turn, then conditionally gives one own Digimon Security Attack +1 for turn when own security ≤ opponent security; Security adds self to hand. IR full. | Direct module covers both independent target choices, inclusive condition, duration, and Security zone move. Existing focused test covers grant and Security return. | 8/10 — runtime not verified |
| ST7-10 ShineGreymon | Static Security Attack +1 and Piercing. IR full. | Direct module and focused keyword/Piercing test cover both clauses. | 8/10 — runtime not verified |
| ST7-09 Gallantmon | Static Security Attack +1; When Attacking mandatory deletion target ≤4000, otherwise +3000; KB Q689–Q691 confirms protected chosen target still counts and no voluntary refusal with a valid target. IR full. | Direct module preserves mandatory target semantics and protected-target branch; focused tests cover no target, successful deletion, and protected target. | 9/10 — runtime not verified |
| ST7-08 WarGrowlmon | When Attacking deletes one opponent Digimon ≤3000; inherited Your Turn Once Per Turn opponent deletion grants Security Attack +1 for turn; KB Q688 confirms the inherited grant applies before Piercing checks. IR full. | Direct module and focused tests cover attack deletion and once-per-turn inherited grant. | 8/10 — runtime not verified |
| ST7-07 RizeGreymon | On Play deletes one opponent Digimon ≤5000. IR full; no card-specific KB entry. | Direct module boundary and focused On Play test cover the clause. | 8/10 — runtime not verified |
| ST7-06 GeoGreymon | Security at end of battle plays self without memory cost; On Play deletes one opponent Digimon ≤4000. KB Q684–Q687 confirms normal Digimon status, outcome-independent timing, ordering before further checks, and On Play targeting. IR full. | Direct module and focused tests cover Security play plus On Play deletion; existing play-prohibition seam is preserved. | 9/10 — runtime not verified |
| ST7-05 Growlmon | Inherited Your Turn Once Per Turn opponent deletion gains 1 memory; KB Q683 and Q2746 cover simultaneous deletion absence and memory ordering versus Retaliation. IR full. | Direct watcher and focused once-per-turn/deletion tests cover the trigger and source lifetime. | 9/10 — runtime not verified |
| ST7-04 Biyomon | Blocker and Your Turn cannot attack players. IR full; no card-specific KB entry. | Direct keyword/restriction and focused illegal player attack test cover both clauses. | 8/10 — runtime not verified |
| ST7-03 Guilmon | Your Turn opponent Lv6+ gate grants hand Gallantmon digivolution for cost 4 ignoring requirements; inherited Your Turn Once Per Turn opponent deletion draws 1. KB Q681–Q682 cover source deletion timing and activation during another digivolve effect. | Corrected explicit owner-turn gate and exact `Gallantmon` target matching. Added near-name rejection test; existing evolution, draw, once-per-turn, and simultaneous-deletion tests retained. | 9/10 — runtime not verified |
| ST7-02 Agumon | Inherited When Attacking against a player gives +2000 for turn; KB Q680 confirms blocked attacks still activate after player declaration. IR full. | Direct timing/target gate and focused test cover player-only attack. | 8/10 — runtime not verified |
| ST7-01 Gigimon | Inherited Your Turn Once Per Turn opponent Digimon deletion gives +2000 for turn. IR full; no card-specific KB entry. | Direct watcher, opponent controller filter, simultaneous deletion guard, and focused test cover the clause. | 8/10 — runtime not verified |

## Verification commands and blockers

- `git diff --check`: passed.
- Requested Corepack shared compilation: attempted; blocked by missing `tsc` after dependency installation failed.
- Requested serial low-memory Vitest from `apps/api`: attempted; blocked because `vitest` is unavailable.
- No unrelated collection was edited. No reset, rebase, force-push, or discard was used.

## Delivery

The source/test changes are limited to ST7-03 and ST7-12. Atomic commit delivery remains blocked by the environment's dependency/runtime state; commit hashes are therefore not available in this audit record.
