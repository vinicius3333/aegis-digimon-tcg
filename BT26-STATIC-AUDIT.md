# BT26 Static Card Implementation Re-audit

Status: static integration complete through BT26-100; audit assigned through BT26-104

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 104 cards, `BT26-001` through `BT26-104`, derived from
the immutable committed catalog at `packages/shared/src/cards/data/cards.json`
and reconciled with 104 direct modules in `apps/api/src/cards/BT26/`.

This ledger follows the repository's `verify-card-implementation` protocol.
Detailed English reports belong under `internal-docs/audits/BT26/`. Ranges are
reviewed and integrated in ascending card order by the coordinator.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, focused/mechanism/
collection gates, and `git diff --check` are prohibited for this static
campaign and remain unexecuted. Scores are provisional, use five fixed
two-point components, and are capped at 8/10 while Executed delivery gates is
0/2.

All 104 direct BT26 modules currently contain `registerIrCard`; none contains
`registerCard`. Each audited module must retain exclusive executable
registration through `registerIrCard(cardId, compiled)`.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT26-001–010 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-001-010.md` | Yes |
| BT26-011–020 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-011-020.md` | Yes |
| BT26-021–030 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-021-030.md` | Yes |
| BT26-031–040 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-031-040.md` | Yes |
| BT26-041–050 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-041-050.md` | Yes |
| BT26-051–060 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-051-060.md` | Yes |
| BT26-061–070 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-061-070.md` | Yes |
| BT26-071–080 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-071-080.md` | Yes |
| BT26-081–090 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-081-090.md` | Yes |
| BT26-091–100 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-091-100.md` | Yes |
| BT26-101–104 | Luna assigned | `internal-docs/audits/BT26/BT26-101-104.md` | No |

## Score model

Each card is scored across Catalog/rules, IR trace, Behavioral proof, Peer and
stack proof, and Executed delivery gates. Unsupported, ambiguous,
structural-only, or manually injected evidence reduces the applicable
non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT26-001 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Deck-add evolution uses a primitive origin and the source fixture omits a legal level-3 intermediary. |
| BT26-002 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | The Tamer-under-card trash watcher is directly injected and the positive host stack is off-color/incomplete. |
| BT26-003 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | A public opponent attack proves redirect/payment boundaries, but the inherited source fixture uses an illegal direct stack. |
| BT26-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the generic hand-card cost; a natural attack proves a Tamer card can be placed face down under a Glowing Dawn Tamer. |
| BT26-005 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Avian/DATA SQUAD and Q6958 boundaries use a realistic stack, but deletion originates through a direct primitive. |
| BT26-006 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Public attacks cover failure edges, while the main play/use positive is manually fired and uses an incomplete Bagra Army stack. |
| BT26-007 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Link source/host restrictions are traced, but the positive attack is manually fired over an off-color/incomplete stack. |
| BT26-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, breeding movement, alternate evolution, bound grants, expiry, and inherited-turn behavior are represented. |
| BT26-009 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Alternate evolution is natural, but phase/attack positives are manual and the inherited fixture omits a legal level-4 intermediary. |
| BT26-010 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Link/evolution and Detach combat are natural, while the principal attack Draw 2 positive remains manually fired. |
| BT26-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, digivolution, payment, Draw 2, matching, refusal, Raid, and a real attack-origin path are represented. |
| BT26-012 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | TB play/use and reduction boundaries are covered, but the Main and inherited positives use named timing helpers. |
| BT26-013 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry, payment, deletion, Blocker, and inherited scope are represented; deletion/inherited cases retain direct helper origins. |
| BT26-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Assembly and entry behavior are natural, while the central top/inherited On Deletion branches use direct deletion helpers. |
| BT26-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Deck-add and ordering boundaries are represented, but principal entry/inherited positives remain timing/subtrigger-driven. |
| BT26-016 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Delete/Recovery, exact mixed-trash payment, keywords, and leave prevention use direct timing/replacement helpers. |
| BT26-017 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Assembly and entry grants are natural; the Shambala/TS free-play On Deletion positive is directly injected. |
| BT26-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and breeding movement prove reveal handling, trait boundaries, Rule Aquatic, source trash, and inherited Jamming. |
| BT26-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attack, Link, When Linking, duration, copy isolation, Detach, and Seven Code stack behavior are represented. |
| BT26-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, evolution, restriction/expiry, empty-deck sequencing, and a real inherited Evade path are represented. |
| BT26-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, activation, attack, reduction, target-lock, inherited payment, trait, and frequency boundaries are represented. |
| BT26-022 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry/security and Barrier paths are represented, while End of Your Turn placement/play uses a direct timing helper. |
| BT26-023 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | DM evolution, costs, targets, Training/Jamming, and inherited bounds are covered; central entry/attack returns are timing-driven. |
| BT26-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural matching play proves the free evolution watcher, owner/turn/source gates, decline, trait union, and inherited Barrier. |
| BT26-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, breeding move, attack, security placement/Recovery, Tamer scope, zero-security, and frequency paths are represented. |
| BT26-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public attack proves reduced Option use and security cost; Tamer-stack alternatives, refusal, frequency, evolution, and Barrier are covered. |
| BT26-027 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | On Play suspension/debuff is public-origin, but the opponent-main-phase branch still uses direct timing injection. |
| BT26-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural App Fusion, Assembly, entry Link, When Linking, Detach, exact materials, source scope, and linked duration are represented. |
| BT26-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security/order, protection, Rule/Decode/Ascension, and stack proof exist, but several central branches use direct helpers. |
| BT26-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public entry/security paths prove payment, Execute/Ascension, free-play ordering, cost/trait boundaries, and realistic TS/Iliad stacks. |
| BT26-031 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public Option use and legal alternate/Tamer stacks exist, while the Digimon and shared Recovery positives use direct timing. |
| BT26-032 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | The Option face is public, but When Digivolving uses `advance.fire` and no public Ceresmon evolution transition is proved. |
| BT26-033 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Public Option use exists; Digivolving/replacement use direct helpers and the corrected legal base is not exercised by public evolution. |
| BT26-034 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Legal inherited hosts were restored, but start-main evolution is directly fired and its free-evolution fixture still uses a synthetic base. |
| BT26-035 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural breeding move, battle-win evolution, alternate route, and corrected legal host exist; On Play remains directly fired. |
| BT26-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play, breeding move, reveal branches, Tamer/color boundaries, attack, frequency, and alternate evolution are represented. |
| BT26-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | App Fusion, Assembly, Link, immediate battle, Link-source scope, and legal green stacks have public/realistic proof. |
| BT26-038 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public alternate/battle-win behavior and corrected legal inherited hosts exist, while the principal On Play positive is directly fired. |
| BT26-039 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public alternate/attack behavior and corrected legal inherited hosts exist; both entry windows remain directly fired. |
| BT26-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play/move/evolution paths prove suspension, generic face-down placement, scaling, Training, and inherited Piercing. |
| BT26-041 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, digivolution, attack, security ordering, suspension, routes, inherited battle win, and frequency are represented. |
| BT26-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play/attack prove independent lock targets, shared entry/attack budget, battle-win survival, and legal stacks. |
| BT26-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play/evolution and inherited play watcher prove scaled face-down locks, target independence, Blocker, refusal, and routes. |
| BT26-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public entry, both reactive event families, reduction, turn scope, replacement cost, and DATA SQUAD stacks are represented. |
| BT26-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public hand-size and attack paths prove strict reduction, free play, Alliance participation, keyword aura, and frequency. |
| BT26-046 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural cost-reduction boundary exists, but the central entry suspend/lock/protection body is timing-fired. |
| BT26-047 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Assembly, battle/immunity, costs, ordering, and lifecycle are covered; principal play/evolution/phase bodies remain timing-injected. |
| BT26-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public attack proves face-down payment, reduced Ver.4 play, Alliance participation, batch-trash scaling, and realistic stacks. |
| BT26-049 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Cost ceilings, shared budgets, Tamer-stack reaction, traits, and peers are covered through direct suspension/stack-trash helpers. |
| BT26-050 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Burst/Option/target/order boundaries and realistic Rosemon stacks are covered; return/security-trash positives use direct timing. |
| BT26-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Link intents prove both the host grant and printed linked-face De-Digivolve; an erroneous interim removal was restored exactly. |
| BT26-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play, reveal slots, overlap, bottoming, Appmon evolution, and inherited Reboot use realistic Glowing Dawn/BEATBREAK stacks. |
| BT26-053 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Cost, Option, frequency, and Blocker boundaries are covered, but target-switch positives use direct subtrigger injection. |
| BT26-054 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Tamer/name, stack-add, redirect, and CS stack boundaries exist; entry and stack-add positives use timing/primitive helpers. |
| BT26-055 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural Counter/deletion and realistic DM stacks supplement the principal shared entry body, which remains mostly timing-driven. |
| BT26-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural deletion, Option use, both routes, empty-hand De-Digivolve, keywords, Rule trait, and Titan/TS boundaries are represented. |
| BT26-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public evolution and Option use prove paid protection, source-kind immunity, shared watchers, gained trigger, and Glowing Dawn stacks. |
| BT26-058 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural leave prevention and CS stack rotation are covered, while the shared immunity window uses direct timing helpers. |
| BT26-059 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Hand-size, Titan, turn, watcher, exclusion, frequency, and tie boundaries exist; the central entry body is timing-driven. |
| BT26-060 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Evolution routes, stack returns, ordering, cleanup, Succession, and deck-add scope are covered through direct timing/primitives. |
| BT26-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and attack paths prove reveal slots, duplicate exclusion, ordering, and inherited behavior on a corrected legal host. |
| BT26-062 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Cost, refusal, alternate evolution, and legal inherited DP host are covered; Start of Main remains directly fired. |
| BT26-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the printed link effect to dedicated `WhenLinking`; public linking proves reveal, deletion, Detach, and source/frequency boundaries. |
| BT26-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and attack paths cover distinct reveal slots and inherited behavior on a corrected legal host. |
| BT26-065 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q7088 unions and a realistic DATA SQUAD stack are represented, while reveal and inherited attack positives use direct timing helpers. |
| BT26-066 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Legal Titan stacks and the Q7089 Alliance boundary are represented; phase and hand-trash reactions remain directly injected. |
| BT26-067 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Legal evolution/Retaliation stacks and effect boundaries exist, but entry and End of Your Turn bodies are timing-fired. |
| BT26-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and attack paths prove principal hand-add, watcher, cost-decline, and inherited behavior with legal stacks. |
| BT26-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play, digivolution, attack, hand-size, deletion, Titan evolution, and Q7090/Q7091 boundaries are represented. |
| BT26-070 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q7092/Q7093 costs and legal inherited Retaliation are covered; entry and Main Option-use positives remain directly fired. |
| BT26-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and attack prove delete-own payment, opponent level boundary, refusal/no-target behavior, routes, and inherited Raid. |
| BT26-072 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural digivolution, face-down Tamer placement, hand-trash alternative, Blocker, and inherited deletion use realistic stacks. |
| BT26-073 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Assembly, costs, free play, Wizard, and inherited security are covered; the central entry body uses direct timing helpers. |
| BT26-074 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Titan Option reduction, shared budget, affordability, and inherited deletion are represented; entry/attack positives are timing-fired. |
| BT26-075 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural DUAL Option, Security, and On Deletion paths prove ordering, limits, keywords, and realistic Glowing Dawn stacks. |
| BT26-076 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Trait/cost ceilings, watchers, and realistic stacks are covered; central digivolution and watcher proof uses direct origins. |
| BT26-077 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Routes, shared budgets, deletion, and stack behavior are represented; the central trash-play behavior is directly fired. |
| BT26-078 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q7105–Q7108 matching/memory boundaries and natural Rush/Execute paths exist; entry/trash watcher positives use direct origins. |
| BT26-079 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Routes, Decode, Retaliation, security, and ownership boundaries use realistic stacks; entry/Trash Main/trim positives use helpers. |
| BT26-080 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural DUAL Option use plus real succession/attack stacks prove orientation, suspend/unsuspend choice, deletion, and keywords. |
| BT26-081 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Legal breeding/Assembly contexts and Iliad budget/aura boundaries are covered; the central entry body uses direct timing helpers. |
| BT26-082 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Face-up security and indivisible Tamer-stack costs are represented; the central alternate-cost deletion body is directly fired. |
| BT26-083 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | A corrected legal Execute/Decode stack supports the proof, while the security-wipe/deletion/recovery body remains timing-fired. |
| BT26-084 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Link proves requirements, reveal resolution, post-link movement, and linked-source lifecycle with realistic Appmon stacks. |
| BT26-085 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Opponent-only DP/stack restrictions and replacement boundaries are traced; principal proof uses direct effect/replacement seams. |
| BT26-086 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | The seven-distinct-card Assembly/Link stack is complete; link-then-attack and linked reactions remain primarily direct-origin. |
| BT26-087 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | TS cost, ordering, Giant Slayer return, draw, refusal, and Security are covered through direct timing helpers. |
| BT26-088 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play-cost replacement proves Boss/TS filters, suspension, one-versus-two reduction, refusal, and Security behavior. |
| BT26-089 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural security-removal origins prove bottom face-down placement, effect-only debuff, ordering, scope, and suspension limits. |
| BT26-090 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Inclusive memory, TS Option, color, reduction-floor, refusal, and Security boundaries exist; End of Turn is directly driven. |
| BT26-091 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | DATA SQUAD placement/evolution and Q7144–Q7148 boundaries are represented; suspension/stack reactions use direct origins. |
| BT26-092 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural opponent attack proves TS Tamer payment, redirect target, turn ownership, refusal, and no-target behavior. |
| BT26-093 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attack proves required suspension, deck-top face-down placement, shared keyword target, and realistic BEATBREAK contexts. |
| BT26-094 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Face-down Tamer ordering/visibility and source gates are covered; hand-trash and under-Tamer reactions use direct primitives. |
| BT26-095 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Required-payment and BEATBREAK deletion boundaries are represented; the central deletion reaction uses a direct deletion verb. |
| BT26-096 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Play-cost reduction, source zones, targets, and peers are covered; the principal Main play path uses declaration timing injection. |
| BT26-097 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public Option use proves color, Main/Security flow, play limits, keyword grants, and realistic TS/Titan contexts. |
| BT26-098 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public Option use proves the indivisible named two-card cost, reductions, ordering, refusal, and legal DM contexts. |
| BT26-099 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public Option play proves reveal/add/bottom behavior; later Delay evolution covers face-down, timing, level, and kind boundaries. |
| BT26-100 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public Main/security paths prove face-up security lifecycle, Titan grants, zero-security behavior, name/trait split, and free play. |

## Aggregate

- Catalog cards: 104
- Direct modules: 104
- Assigned: 104
- Integrated card audits: 100
- Corrected: 2
- Provisional: 100
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 57
- Remaining unassigned: 0

The integrated provisional score subtotal is 735/1000 through BT26-100.
BT26-101–104 remains active in the final Luna/xhigh audit lane while an
independent BT26 static reconciliation runs in parallel. No
collection-complete claim is made while the static audit and delivery gates
remain incomplete.
