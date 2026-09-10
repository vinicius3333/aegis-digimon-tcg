# EX1 re-audit review notes

## Coordinator decisions

- The older `docs/audits/EX1-AUDIT.md` is historical context only. Current scores require fresh per-card reports and coordinator reruns.
- Every card module must end without `// @ts-nocheck` and register executable behavior exclusively through `registerIrCard(cardId, compiled)`.
- Delivery credit remains zero until collection-wide gates, atomic commits, and branch push pass.

## Engine seam queue

- Closed — `inherited-security-watch-next-own-turn-reregistration`: no engine defect. The fixture exhausted its two-card deck before EX1-031 Recovery, so no security card/event existed. Four inert deck cards make the public sequence green; mechanism documented in `INHERITED-SECURITY-WATCH-MECHANISM.md`.
- Closed — `newly-evolved-inherited-watcher-registration`: no engine defect. The retained red evolved EX1-039 onto a level 4, leaving its inherited effect on the top card and correctly inactive. Evolving EX1-039 into EX1-042 places it below the top and the same-turn watcher works; documented in `NEWLY-EVOLVED-WATCHER-MECHANISM.md`.

## Fixture traps

- Do not place Digi-Eggs in deck or security.
- Do not use numeric `security: <n>` shortcuts.
- Injected timings such as `advance.fire`, `fireSubTrigger`, or `fireTiming` do not prove behavior.
