# Security check ordering and checked-card areas

BT20-005 Q4284 requires immediate Security activation followed by a single simultaneous pool across all other check-trigger families. CR 13-1-6 removes the checked card from security before effects; 13-1-8-3 battles only a checked Digimon that has not acquired an area.

The lead implemented a temporary exact-card context, separate from every area. Security self-relocation and EX5-053's checked-Deva target can access this identity; ordinary security enumeration and counts cannot. Self-play does not publish a second security-removal event. Relocated cards do not battle or get trashed again. The resolver snapshots reveal, OnSecurityCheck, OnLoseSecurity and removal watchers before immediate Security, then offers controller ordering across their pending pool, retaining turn-player priority. Window consumption clears for later attacks and turn resets.

Independent Luna C review identified the generic `isInSecurity` exception as misleading. The lead restored physical zone lookup and moved the checked-source exception into the dedicated Security builder. A public-check regression now asserts that generic security lookup is false while exact-card relocation remains possible. No production card registration was changed.

Evidence:

- `simultaneous-red-confirmed.log`: the previous separate-family resolver offered 2 own triggers instead of all 4; regression failed for the intended ordering gap.
- `security-reviewed-mechanisms.log`: 17 files, 313 tests passed. Exact command: `pnpm --filter @aegis/api exec vitest run src/engine/security src/engine/effects/builders.test.ts src/engine/effects/interpreter.test.ts src/engine/securityStrikeCount.test.ts src/engine/securityCheckAnnouncement.test.ts src/engine/continuousSubtriggerAccumulation.test.ts src/engine/conformance/ch13-security-checks.test.ts src/cards/BT20/BT20-005.test.ts src/cards/BT20/BT20-018.test.ts src/cards/EX5/EX5-053.test.ts src/cards/BT15/BT15-037.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=15000`.
- `security-reviewed-typecheck.log`: `pnpm --filter @aegis/api typecheck`, exit 0.
- `checked-card.test.ts`: public attacks prove exact checked Deva vs remaining Deva, checked non-Deva rejection, one removal for Security self-play, repeated watcher activation, and checked-card placement under a permanent without duplicate trashing.
- `simultaneousCheckTriggers.test.ts`: the mandatory/optional Security decision precedes the four own pending effects; both opponent timing effects follow; observable memory/trace and OnLoseSecurity announcement provenance are asserted.

This is an engine checkpoint. Full collection scoring, remaining card reviews, final collection tests and delivery gates remain open.
