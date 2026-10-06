# Effect battle and Asuna return pacing integration — 2026-10-05

Two animation fixes from one live bot match are integrated into `feat/effects-lab`, with one server fix found in review.

## What changed

| Fix | Source | Parent commit |
| --- | --- | --- |
| A card an effect plays after a paid deck return (BT24-088 Asuna Shiroki playing BT25-092) waits for the return to land, then a 120 ms beat. Only deck returns hold the play. | `7678f0a90` | merge `ecdc483b7` |
| An effect battle (EX13-076 Imperialdramon: Paladin Mode) shows its own clash, arrow and blow. The server's `battleCompared` now carries `effectBattle` with both public faces. Impacts queue instead of replacing each other, and a loser's deletion and notices wait for its own blow, also across batches. | `7bae78c0a` | merge `96c050972` |
| The server published an effect battle's result as the attack's `combatResolved` when the attack's own battle never ran. The client could then draw a second clash against a deleted card. `completedCombat` is now set only for the attack's own battle. | — | `200a224be` |
| Effects Lab lists both scenes. | — | `3e4661600`, `96c050972` |

Two tests that read effect battles from the leaked `combatResolved` now use the battle deletion receipts instead: `attackSuspensionTriggerOrdering.test.ts` (EX13-044) and `BT21-015.test.ts` (Callismon).

## Preview

- Imperialdramon: `/dev/effects-lab?scenario=effects-lab-paladin-battle`. Pass breeding, digivolve UlforceVeedramon into Imperialdramon: Paladin Mode and accept the effect.
- Asuna: `/dev/effects-lab?scenario=arena-bt24-asuna-return-play`. Pass breeding and end the turn; the bot's Asuna returns to the deck, then the other Asuna enters from the trash.

Both links use the existing Reset, Pause and speed controls.

## Validation

All on Node 26.

- After the battle merge: web and API typechecks clean; `git diff --check` clean.
- Web focused set (hook, combat, impact clock, deck return, catalog, arrival and tracking-arrow tests): 287 of 289 passed. The two failures, the clause-read deletion tests in `useMatchCues.test.ts`, also fail on the pre-merge commit `3e4661600`.
- API focused set (combat, effects lab scenes, EX13-076 ordering, Asuna scene, and both updated tests): 366 of 366 passed.
- Before the battle merge, every API test file that mentions `combatResolved`, plus the battle and EX13 files: 3,711 of 3,711 passed. The new regression fails without the guard.
- Real server through the public WSS port, after an API rebuild and restart:
  - Imperialdramon: `battleCompared` with `effectBattle` (EX13-076 vs BT25-085), then its battle deletion in the same batch, and no `combatResolved`.
  - Asuna: trigger, return to deck bottom, play from trash, resolution, in that order.
- Both preview links return HTTP 200.

## Limits

- This integration did not add browser measurements. The child owners' captures are their evidence.
- A deck return and a play in the same server batch are not ordered by the landing beat. The beat starts at wall-clock landing time.
- Blow gates for battle losers that survive stay in a per-match map. They are already open, so they never delay anything.
- The full-match replay screen was cancelled and is not included.

## Services

The public preview stays up for the user:

- API on port 2571 runs in Orca terminal "SERVICE API 2571".
- Vite on port 5174 runs in Orca terminal "SERVICE Vite 5174".
- The existing Tailscale mappings (9445 to 5174, 9446 to 2571) are unchanged.
