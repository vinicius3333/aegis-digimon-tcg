# LM runtime audit ledger

Status: source tracing is complete; no card is marked 10/10 until its focused
runtime suite and the collection gate have been rerun in this worktree.  Every row
uses the committed catalog as printed-text authority, `node tools/kb/query.mjs card
<id>` (the `KB` count), the direct `apps/api/src/cards/LM/<id>.ts` compiled IR, its
colocated behavioral suite, and the shared action/replacement primitive named below.

| Card | Clauses and primitive trace | KB | Existing behavioral evidence | Source status |
| --- | --- | ---: | --- | --- |
| LM-001 | Blast/evolution placement, scaled DP deletion, deletion memory; `PlaceUnder`, `Delete`, `GainMemory` | 0 | 8 focused cases | traced; runtime pending |
| LM-002 | Start-main and inherited hand-threshold draw; `Draw`/turn timing | 2 | 6 cases | traced; runtime pending |
| LM-003 | Blue-hand discard battle protection and inherited draw; `Trash`, battle replacement | 3 | 6 cases | traced; runtime pending |
| LM-004 | Blue discard, unsuspend, Blocker, hand-trash watcher; `Trash`, `Unsuspend`, `GainKeyword`, subtrigger | 0 | 6 cases | traced; runtime pending |
| LM-005 | Blast, variable hand trash/under-card trash, return, Security Attack; `Trash`, `Return`, `GainKeyword` | 2 | 7 cases | traced; runtime pending |
| LM-006 | Trash-main cost reduction, bottom-stack trash and attack lock; `PlayWithoutCost`, `Trash`, restriction | 1 | 5 cases | traced; runtime pending |
| LM-007 | Security free play and mandatory end-attack self security; `PlayWithoutCost`, `placeAsSecurity` | 1 | 4 cases | traced; runtime pending |
| LM-008 | Start-main memory and inherited Angoramon DP; `GainMemory`, `GrantStatic` | 0 | 7 cases | traced; runtime pending |
| LM-009 | Angoramon-text play/evolution reducer and suspension Rush; replacement/cost, `GainKeyword` | 2 | 7 cases | traced; runtime pending |
| LM-010 | Tamer suspension/unsuspend lock and suspended-Tamer DP; `Suspend`, restriction, static DP | 0 | 6 cases | traced; runtime pending |
| LM-011 | Opponent suspension, no-unsuspended branch, inherited DP; `Suspend`, conditional, `GainKeyword` | 1 | 6 cases | traced; runtime pending |
| LM-012 | Suspension/no-unsuspend branch and inherited battle-security trash; `Suspend`, restriction, security | 0 | 5 cases | traced; runtime pending |
| LM-013 | Blast, suspension branch, delayed free play/return; `PlayWithoutCost`, duration | 1 | 6 cases | traced; runtime pending |
| LM-014 | Reveal-add for <Blocker> or Tamer and attack-target-switch draw watcher; `RevealAdd`, subtrigger | 0 | 6 cases | corrected from official card-list evidence; runtime pending |
| LM-015 | Named alternate evolution and X Antibody inherited DP; `Digivolve`, static DP | 0 | 7 cases | traced; runtime pending |
| LM-016 | Effect-deletion-only trash evolution and inherited Hiro play; replacement/subtrigger, `PlayWithoutCost` | 0 | 6 cases | traced; runtime pending |
| LM-017 | Blast, hand trash/bottom placement, add-stack trigger with deletion cost/free play; `PlaceUnder`, `SubTrigger`, `PlayWithoutCost` | 0 | 6 cases | traced; runtime pending |
| LM-018 | Level ceiling deletion and contingent Gyuukimon Token; `Delete`, token play | 0 | 6 cases | traced; runtime pending |
| LM-019 | Gammamon reveal-add and leave-play replacement by self deletion; `RevealAdd`, `Replacement` | 1 | 6 cases | traced; runtime pending |
| LM-020 | Owner-security placement/exchange and opponent-turn category immunity; `SecurityManipulation`, `DeclareCategoryImmunity` | 10 | 8 cases | traced; runtime pending |
| LM-021 | Security-gated named evolution, Blast, aggregate DP deletion, security trash; `Digivolve`, `Delete`, security | 7 | 7 cases | traced; runtime pending |
| LM-022 | Security-gated named evolution, Blast, stack-count return, unsuspend; `Digivolve`, `Return`, `Unsuspend` | 5 | 6 cases | traced; runtime pending |
| LM-023 | Named evolution, hand-to-security, option/security watcher DP reduction; `placeAsSecurity`, `GrantStatic` | 5 | 7 cases | traced; runtime pending |
| LM-024 | Pulsemon evolution, two security-count branches and suspended immunity; conditional, `Return`, restriction | 3 | 6 cases | traced; runtime pending |
| LM-025 | Blast, reveal/free Tamer play, ordering choice, De-Digivolve; `RevealAdd`, `PlayWithoutCost`, `DeDigivolve` | 0 | 5 cases | traced; runtime pending |
| LM-026 | Named evolution/Blast, DP deletion, leave-play Guilmon relocation, name rule, inherited DP ceiling; `Replacement`, `Delete`, modifier | 4 | 7 cases | traced; runtime pending |
| LM-027 | Red Scramble main, Delay, security; `Digivolve`, `RevealAdd`, `PlayWithoutCost` | 5 | 8 cases | traced; runtime pending |
| LM-028 | Blue Scramble main, Delay, security; `Digivolve`, `RevealAdd`, `PlayWithoutCost` | 5 | 6 cases | traced; runtime pending |
| LM-029 | Yellow Scramble main, Delay, security; `Digivolve`, `RevealAdd`, `PlayWithoutCost` | 7 | 6 cases | traced; runtime pending |
| LM-030 | Green Scramble main, Delay, security; `Digivolve`, `RevealAdd`, `PlayWithoutCost` | 5 | 6 cases | traced; runtime pending |
| LM-031 | Black Scramble main, Delay, security; `Digivolve`, `RevealAdd`, `PlayWithoutCost` | 5 | 6 cases | traced; runtime pending |
| LM-032 | Purple Scramble main, Delay, security; `Digivolve`, `RevealAdd`, `PlayWithoutCost` | 5 | 6 cases | traced; runtime pending |
| LM-033 | Alternative black color, red/black reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 2 | 6 cases | traced; runtime pending |
| LM-034 | Alternative red color, blue/red reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 2 | 6 cases | traced; runtime pending |
| LM-035 | Alternative purple color, yellow/purple reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 2 | 6 cases | traced; runtime pending |
| LM-036 | Alternative blue color, green/blue reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 2 | 6 cases | traced; runtime pending |
| LM-037 | Alternative yellow color, black/yellow reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 2 | 6 cases | traced; runtime pending |
| LM-038 | Alternative green color, purple/green reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 2 | 6 cases | traced; runtime pending |
| LM-039 | Named evolution, Blitz, return-or-Security-Attack branch, target lock; `Return`, conditional, restriction | 0 | 6 cases | traced; runtime pending |
| LM-040 | Named evolution/Iceclad, bulk under-card trash, stack comparison/security DP reduction; `Trash`, conditional, DP modifier | 1 | 6 cases | traced; runtime pending |
| LM-041 | DS evolution, unsuspend, security-to-hand branch and suspend prohibition; `Unsuspend`, security, restriction | 0 | 5 cases | traced; runtime pending |
| LM-042 | Angel evolution, Security Attack, suspend/prohibition and deletion security placement; `Suspend`, restriction, `placeAsSecurity` | 5 | 4 cases | traced; runtime pending |
| LM-043 | D-Brigade evolution/Blast/Scapegoat, De-Digivolve then lowest-cost deletion; `DeDigivolve`, `Delete` | 0 | 4 cases | traced; runtime pending |
| LM-044 | Blast, Blocker/Retaliation and hand-size deletion branch; keywords, `Trash`, `Delete` | 1 | 5 cases | traced; runtime pending |
| LM-045 | Alternative yellow color, red/yellow reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 0 | 6 cases | traced; runtime pending |
| LM-046 | Alternative purple color, blue/purple reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 0 | 6 cases | traced; runtime pending |
| LM-047 | Alternative green color, yellow/green reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 0 | 6 cases | traced; runtime pending |
| LM-048 | Alternative black color, green/black reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 0 | 6 cases | traced; runtime pending |
| LM-049 | Alternative blue color, black/blue reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 0 | 6 cases | traced; runtime pending |
| LM-050 | Alternative red color, purple/red reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 0 | 6 cases | traced; runtime pending |
| LM-051 | Alternative green color, red/green reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 0 | 6 cases | traced; runtime pending |
| LM-052 | Alternative yellow color, blue/yellow reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 0 | 6 cases | traced; runtime pending |
| LM-053 | Alternative purple color, black/purple reveal, Delay; color waiver, `RevealAdd`, `GainMemory` | 0 | 6 cases | traced; runtime pending |
| LM-054 | Training color-ignore, dual-color reveal, paid reduced Delay evolution, security; waiver, `Digivolve`, `RevealAdd` | 0 | 6 cases | traced; runtime pending |
| LM-055 | Training color-ignore, dual-color reveal, paid reduced Delay evolution, security; waiver, `Digivolve`, `RevealAdd` | 0 | 6 cases | traced; runtime pending |
| LM-056 | Training color-ignore, dual-color reveal, paid reduced Delay evolution, security; waiver, `Digivolve`, `RevealAdd` | 0 | 6 cases | traced; runtime pending |
| LM-057 | Training color-ignore, dual-color reveal, paid reduced Delay evolution, security; waiver, `Digivolve`, `RevealAdd` | 0 | 6 cases | traced; runtime pending |
| LM-058 | Training color-ignore, dual-color reveal, paid reduced Delay evolution, security; waiver, `Digivolve`, `RevealAdd` | 0 | 6 cases | traced; runtime pending |
| LM-059 | Training color-ignore, dual-color reveal, paid reduced Delay evolution, security; waiver, `Digivolve`, `RevealAdd` | 0 | 6 cases | traced; runtime pending |
| LM-060 | Training color-ignore, dual-color reveal, paid reduced Delay evolution, security; waiver, `Digivolve`, `RevealAdd` | 0 | 6 cases | traced; runtime pending |
| LM-061 | Training color-ignore, dual-color reveal, paid reduced Delay evolution, security; waiver, `Digivolve`, `RevealAdd` | 0 | 6 cases | traced; runtime pending |
| LM-062 | Training color-ignore, dual-color reveal, paid reduced Delay evolution, security; waiver, `Digivolve`, `RevealAdd` | 0 | 6 cases | traced; runtime pending |

## Catalog residual reconciliation

The committed effects catalog retains eleven `RawUnparsed` actions across LM-009,
LM-017, LM-019, LM-020 (three actions), LM-026, LM-048, LM-049, LM-050, and
LM-062.  The direct executable modules replace each of them with structured IR;
the targeted source traces are recorded in their ledger rows.  This is not runtime
proof: the pending focused runs must establish the behavior in the current engine.

## Post-ledger correction

The LM-014 catalog import omits the keyword icon in its reveal filter. The official
card list at `https://world.digimoncard.com/cards/?card_no=LM-014&search=true`
identifies it as <Blocker>; the direct IR now filters `Blocker` (not `Draw`) and a
focused positive case covers that distinction. This correction is awaiting the same
runtime validation as the rest of the collection.

## Required closeout

Run one explicit `LM-<id>.test.ts` process at a time with forks/single-fork/no file
parallelism after the unrelated root-worktree Vitest process clears. Run the final collection gate, then run typecheck, inventory and
`git diff --check`; only then may the rows be promoted to reproducible 10/10.
