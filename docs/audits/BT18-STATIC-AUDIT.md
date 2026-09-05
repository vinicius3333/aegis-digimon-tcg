# BT18 Static Card Implementation Re-audit

> Historical report: superseded by `docs/audits/BT18-AUDIT.md`, which records the completed 102/102 10/10 audit and executed gates.

Status: historical provisional evidence; no longer the completion authority

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT18-001` through `BT18-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT18 workers may prepare static range
Evidence in five parallel Luna lanes. BT17 static coverage is now recorded,
so accepted BT18 ranges may be integrated in strict ascending order. Detailed English reports belong under
`internal-docs/audits/BT18/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT18-001–010 | Reviewed | `internal-docs/audits/BT18/BT18-001-010.md` | Yes |
| BT18-011–020 | Reviewed | `internal-docs/audits/BT18/BT18-011-020.md` | Yes |
| BT18-021–030 | Reviewed | `internal-docs/audits/BT18/BT18-021-030.md` | Yes |
| BT18-031–040 | Reviewed | `internal-docs/audits/BT18/BT18-031-040.md` | Yes |
| BT18-041–050 | Reviewed | `internal-docs/audits/BT18/BT18-041-050.md` | Yes |
| BT18-051–060 | Reviewed | `internal-docs/audits/BT18/BT18-051-060.md` | Yes |
| BT18-061–070 | Reviewed | `internal-docs/audits/BT18/BT18-061-070.md` | Yes |
| BT18-071–080 | Reviewed | `internal-docs/audits/BT18/BT18-071-080.md` | Yes |
| BT18-081–090 | Reviewed | `internal-docs/audits/BT18/BT18-081-090.md` | Yes |
| BT18-091–100 | Reviewed | `internal-docs/audits/BT18/BT18-091-100.md` | Yes |
| BT18-101–102 | Reviewed | `internal-docs/audits/BT18/BT18-101-102.md` | Yes |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT18-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal red stack and two natural attacks prove the exact DP deletion, Tamer condition, and once-per-turn boundary (`2325e63ad`). |
| BT18-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal blue host observes the self-excluding other-blue-Digimon +1000 DP aura appear and disappear (`2b3dded8b`). |
| BT18-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal yellow stack and repeated natural attacks prove the Tamer-gated -2000 DP effect and once-per-turn boundary (`65e6ccd55`). |
| BT18-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production turn flow proves accepted and declined start-main security exchange branches on a legal green host (`a0020656d`). |
| BT18-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added an exact self/field watcher filter; unrelated and repeated natural battle deletions prove source scope and once-per-turn draw (`df1547cfb`). |
| BT18-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural losing battle on a legal purple stack proves distinct opposing Digimon/Tamer color scaling and the no-source boundary (`ec9004503`). |
| BT18-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, Pagumon alternate evolution, reveal-category boundary, and inherited Retaliation use legal red/purple fixtures (`2951918c7`). |
| BT18-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves the 2000-DP deletion ceiling, and legal red evolution preserves the source stack (`54d347540`). |
| BT18-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent Digimon deletion proves non-Tamer memory gain is blocked while shared capability paths preserve Tamer and dual-kind exceptions (`430e48ab0`). |
| BT18-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Digimon- and Tamer-to-Hybrid evolution plus a non-Hybrid negative prove the owned-source watcher and once-per-turn memory gain (`16d8f49e6`). |
| BT18-011 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural BurningGreymon evolution proves return/decline and inherited-Tamer filtering, but no exact Ten Warriors peer target is separately exercised (`2707bb73f`). |
| BT18-012 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play, Gigasmon evolution, DP boundaries, and inherited attack are covered; a natural same-turn second attack is absent (`849688dae`). |
| BT18-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and both evolution routes prove trash cost/return, decline, mixed traits, Raid, and inherited Retaliation (`0bb87db9c`). |
| BT18-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/evolution proves Rush and a real attack proves the deletion boundary; no natural same-turn reattack proves frequency (`f168b9df4`). |
| BT18-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution, attack, cost decline, lowest-DP selection, inherited Security Attack, and losing-battle DNA use legal Kimeramon/Machinedramon stacks (`66afdbbe1`). |
| BT18-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural red evolution proves Blitz/cost and a natural attack proves the opponent-turn DP duration (`822f1c041`). |
| BT18-017 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural entry, tied-lowest deletion, both losing-battle replacement branches, and public DigiXros are covered; optional refusal remains unproved (`c9265a94d`). |
| BT18-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural legal Takuya evolution and repeated attacks prove color scaling, optional attack, requirement boundary, unsuspend, and once-per-turn bonus (`059adc110`). |
| BT18-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, public DNA, decline, DigiXros distinct slots, and complete/incomplete losing-battle recovery prove the preserved hand-authored DNA requirement (`613ebe053`). |
| BT18-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural blue evolution and live observation prove the self-bound Aquatic Rule trait and stack preservation (`af6e46ff3`). |
| BT18-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution and inherited replacement cases prove multicolor reduction, self/Tamer/breeding boundaries, and monocolor rejection (`6e648b09c`). |
| BT18-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Tommy evolution, attack evolution, and opponent battle deletion prove bottom-stack trash, cost reduction, and own-stack Tamer play (`5e695968e`, `1a358b3fc`). |
| BT18-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play/When Digivolving reveal, place-under, alternate evolution, and inherited attack return prove both categories and stack behavior (`080d3a7fe`). |
| BT18-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play and legal Lanamon evolutions prove no-stack placement, stack-enabled return, inherited return, and named cost (`ed0ec92d1`, `a2fc34f5d`, `07bd253a4`). |
| BT18-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution proves the stackless restriction, duration and stacked negative; legal alternate costs and both Jamming projections are covered (`67dfc6103`). |
| BT18-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public hand activation proves atomic named costs and refusal; legal Hybrid evolution proves stackless deletion, Ice Clad, trait, and inherited DP (`f8dcd4b56`, `461023cfd`). |
| BT18-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks prove both legal own-stack play alternatives and zero-memory payment (`151421ed1`). |
| BT18-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution proves every bottom-stack trash, the stackless restriction/duration, DigiXros, leave replacement, and trait grant (`eb5819b44`). |
| BT18-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution and leave flows prove the scaled level return, DigiXros, source return, and stack play branches (`425db2b1c`). |
| BT18-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/reveal and opponent effect deletion prove dual-category selection and the inherited security replacement boundary (`be5fbd84c`). |
| BT18-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal proves both categories, duplicate caps, controller scope, and once-per-turn inherited-Tamer memory (`be1e4b007`). |
| BT18-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural matching/nonmatching plays prove self-exclusion, turn scope and frequency; a legal inherited host proves attack DP duration (`f547f1643`). |
| BT18-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public hand activation proves the exact trash cost, empty-breeding placement, occupied/missing-cost rejection, and optional decline (`a1c1f3fa8`). |
| BT18-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and turn progression prove security choice/recovery, start-main, Chaos Mode end-turn evolution, and BT7-111 exclusion (`b2f08c198`). |
| BT18-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural security battle proves free play; legal yellow evolution and inherited attacks prove target, duration, and frequency (`7d734e023`). |
| BT18-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added the opponent-effect leave-cause filter; natural evolution and opponent deletion prove the security/draw/memory clause and inherited prevention (`efcde4c6a`). |
| BT18-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal public Koji evolutions prove security add/recovery/shuffle and decline; natural attack covers the inherited hand-size draw (`5869b84f8`, `d85d73613`). |
| BT18-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/deletion and Angel evolution prove optional placement, mandatory security-to-hand, inherited recovery, and exact count boundaries (`eb4b0455e`). |
| BT18-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution/decline prove original-DP semantics, while public attacks against both players prove security-owner scope and once-per-turn unsuspend (`70f0f1fea`, `4fdd94580`). |
| BT18-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, evolution, attack and Counter Blast Digivolve prove all three security-costed DP clauses, threshold auras, Overflow, and ACE stack behavior (`e06d19efc`). |
| BT18-041 | 1/2 | 2/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | Added four KB-backed DNA requirements and natural play/evolution/deletion/DNA proof; the immutable catalog omits the Q2965 DNA header (`58f464069`, `347da577c`). |
| BT18-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Removed spurious optionality; natural evolution, opponent-turn end, attacks, shared frequency, and six-Hybrid Koji route prove all clauses (`f0f366897`, `7c03d9525`). |
| BT18-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution intents prove Digimon/Tamer reduction sources, breeding and destination negatives, frequency, and inherited Piercing (`03a81655d`). |
| BT18-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Removed false optionality from mandatory security exchange; natural play, no-candidate, face-up Security, alternate evolution, and inherited DP prove the flow (`18a61cf8c`). |
| BT18-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Live suspended/active states and two independent legal auras prove the self-excluding other-Digimon DP grant (`c94aca50e`). |
| BT18-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks prove the relative-DP player restriction while permitting Digimon targets; face-up Security, alternate evolution, Rule trait, and inherited DP are covered (`bc4889a1d`). |
| BT18-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Removed false optionality from mandatory costs; natural play/evolution/attack prove own suspension payment, opposing targets, no-cost boundary, Rule, and frequency (`7d7c964f7`). |
| BT18-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural legal evolution, attack-driven Hybrid evolution, named routes, and effect deletion prove suspension, reduction, and inherited stack play (`71c6c172f`). |
| BT18-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and Kazemon evolution prove target ownership and modifier duration; both named routes and top/inherited Piercing use legal stacks (`be13d4dff`). |
| BT18-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, Arbormon evolution, ownership/level negatives, and inherited attacks prove both unsuspend timings and suspension frequency (`92684b946`). |
| BT18-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Hydramon evolution and unsuspended/wrong-host/level/trait negatives prove the suspended Plant/Vegetation cost reduction (`bf4fd04bf`). |
| BT18-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play and two natural battles prove per-face-up-security De-Digivolve, Security Blocker, inherited trash, and frequency (`9487d8d5e`). |
| BT18-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public hand activation proves exact Kazemon/Zephyrmon cost and refusal; legal evolution proves suspension lock, Raid, and inherited DP (`f308e27fa`). |
| BT18-054 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry, DigiXros, and opponent battle prove DP-bounded mass suspension/lock and own-stack leave replacement (`20103d6a4`). |
| BT18-055 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battles and opponent bounce prove suspension watcher, frequency, optional leave branches, and Q3968 Alliance-source interaction (`27c42fb77`). |
| BT18-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battles prove another-own-Digimon unsuspend and frequency; effect-deletion negative, security scaling, Piercing, Reboot, and alternate evolution are covered (`d083fb202`). |
| BT18-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Two natural multicolor Tamer evolutions plus breeding and controller boundaries prove reduction scope/frequency and inherited Blocker (`23a54e844`). |
| BT18-058 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves Knightmon-text discard, draw, refusal/no-candidate behavior, while a legal stack proves inherited DP (`5fc1144b2`). |
| BT18-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Digimon/Tamer memory sources and battle deletion prove player scope, Tamer exception, and immediate restriction removal (`1389ea589`). |
| BT18-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves both reveal dispositions and remainder; legal Vemmon-text evolutions prove inherited reduction, frequency, host and turn boundaries (`a68e6a4a6`). |
| BT18-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal and opponent-turn flow prove union placement, refusal, own-stack Tamer play, frequency, and Machine-only Collision (`4d91b3208`). |
| BT18-062 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry and completed opponent turn prove Knightmon-text payment, refusal, deletion protection, duration, and inherited DP (`0ccfc6d62`). |
| BT18-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural named evolution, attack-driven Hybrid evolution, protection, and opponent/own leave flows prove alternate routes and own-stack inherited Tamer play (`1834e7b03`). |
| BT18-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution and completed opponent turn prove return protection, hand/deck scope, expiration, named route, and inherited DP (`21044c951`). |
| BT18-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public DigiXros and real turn ends prove trash materials, non-Vemmon gate, placement/refusal, four-source evolution, and inherited return/unsuspend/Blocker (`200d9ef51`). |
| BT18-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution proves exact hand/trash Hybrid placement and last-placed On Play activation, refusal/exclusion, alternate route, and inherited DP (`8d89dcd9d`). |
| BT18-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and both alternate evolutions prove De-Digivolve targeting, stack isolation, and top/inherited Blocker (`7cf6d0118`). |
| BT18-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added any-deck controller scope; real decisions prove own/opponent reveal-five and chosen top/bottom return while preserving Blocker (`6f5fbec94`). |
| BT18-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production opponent-turn flow proves forced player attack; live inherited-text matching now recognizes bracketed Knightmon references and grants host-only DP (`a731be3b2`, `a3cd02512`). |
| BT18-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added exact Beetlemon/MetalKabuterimon material names; public hand activation, same-name negative, Collision, target switch, and natural inherited attack prove the contract (`24ec4bff8`). |
| BT18-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the exact Sephirothmon route and required Mercurymon stack card; natural evolution, Blast, de-digivolution, Blocker, and attack-target-change paths cover the card (`5b92c47be`). |
| BT18-072 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the distinct DigiXros pair and bound the leave replacement to its own stack; natural entry, evolution, DigiXros, battle loss, and cross-stack negative prove the result (`c162852cc`, `0d99e6e6d`, `578ab0460`). |
| BT18-073 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added the Composite self-delete play-cost reducer; natural play, evolution, deletion DNA, and inherited redirect use legal sources and stacks (`9a7949719`). |
| BT18-074 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the DigiXros pair, optional leave modal, and reveal-play kind filter; natural entry, Option rejection, DigiXros, and both leave branches prove the behavior (`9234685f9`, `bd17e4ba6`). |
| BT18-075 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural self/Tamer evolution, once-per-turn, breeding exclusion, multicolor boundary, and inherited Retaliation cover the existing implementation (`7ef7564db`). |
| BT18-076 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected attack-evolution payment and inherited replacement cause/stack scope; natural evolution, attack, battle loss, and cross-stack negative prove the paths (`718b23f6e`, `8e6001077`). |
| BT18-077 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, evolution, level-boundary deletion, and losing battle prove both printed and inherited behavior (`a6968d8fa`). |
| BT18-078 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution, attack evolution, opponent-turn duration, and inherited deletion use legal Hybrid and Tamer stacks (`b8196e381`, `588cd4d2c`). |
| BT18-079 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry, three-color scaling, End of Attack cost/deletion, and inherited Retaliation replace structural-only evidence (`91bfbef8b`). |
| BT18-080 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution and inherited battle prove both ordered deletions, color/cost boundaries, and Retaliation (`ed435bb52`). |
| BT18-081 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected exact material names and bound both placements plus the hand evolution to one selected Tamer; public activation proves the compound path (`05f63ad5a`). |
| BT18-082 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Routed the optional deletion target choice to the opponent and required exact Lucemon evolution; natural play/evolution cover both choice branches and the leave replacement (`b8742604d`). |
| BT18-083 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the unqualified Collision aura from own-side to all Digimon; live targets on both sides prove the DP-relative boundary (`864f0aa27`). |
| BT18-084 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected distinct DigiXros alternatives and own-stack leave source; natural DigiXros, entry deletion, opponent removal, and slot negative prove the behavior (`924662e11`, `2090cf83f`). |
| BT18-085 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural exact Zanbamon evolution with four opponent-trash colors proves cost, DP, and Security Attack scaling (`54747f621`). |
| BT18-086 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected exact Security-play name and the 0-DP aura target while retaining substring Lucemon presence; natural security, deletion, breeding, and variant-negative flows prove the paths (`9abada61f`, `bbeb53a5a`). |
| BT18-087 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural turn start, opponent-security removal, DP boundary, suspension cost, and Security self-play cover the existing implementation (`833834a54`). |
| BT18-088 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Bound start-main placement under this Tamer and gated inherited attack to Hybrid/Ten Warriors; natural turns, security, eligible attack, and non-Hybrid negative prove it (`477eb5329`, `7fdb6b260`). |
| BT18-089 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural main-phase payment, Security self-play, attack-source trash, and conditional draw cover the card (`95b9972d2`). |
| BT18-090 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural main-phase payment, Security self-play, battle deletion, and inherited-effect Tamer selection cover the card (`133c95db5`). |
| BT18-091 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural main-phase payment, Security check, Raid target switch, decline, and once-per-turn inherited Tamer play replace injected timing proof (`4b0d793bc`). |
| BT18-092 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Bound the two-Vemmon return cost to the attacking stack; natural turn, attack, Security, successful payment, and no-stack negative prove the paths (`47dfb10f1`, `ec0cabbb6`). |
| BT18-093 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural turn progression covers both memory thresholds and both valid hand-cost categories; a natural Security check proves self-play (`f190cb879`). |
| BT18-094 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Security, main-phase payment, inherited attack return, and decline use a legal Hybrid/Tamer stack (`414609221`). |
| BT18-095 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added distinct Hybrid names, five-card Tamer threshold, and exact EmperorGreymon destination; natural five-card and duplicate/four-card cases prove it (`2e4f6ae71`). |
| BT18-096 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected battle-area Tamer placement under exact Susanoomon with assignable-color validation and actual moved-count scaling; natural four-color and duplicate-color cases prove it (`f692b48a3`). |
| BT18-097 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added distinct Hybrid names, five-card Tamer threshold, exact MagnaGarurumon destination, and natural Security proof (`37b6769db`). |
| BT18-098 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Scoped the Main cost to top security; natural direct-security trash, deletion, DP reduction, Security deletion, and Recovery prove the sequence (`02030c42d`). |
| BT18-099 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Separated target-switch Delay arming from the payload and gated arbitrary Delay actions; natural Raid, activation, keyword grants, and Security play prove the flow (`d7d82bcf4`). |
| BT18-100 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected breeding scope, exact Main Lucemon, any opposing Option target, and typed reduced-cost nested digivolution; natural Main, Delay, boundary, and Security flows prove it (`8d622dd1c`). |
| BT18-101 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected exact Larva/Chaos Mode references and optional empty-breeding processing; natural evolution, decline, occupied-breeding, and end-of-turn flows prove both branches (`1e5113116`). |
| BT18-102 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected source-stack color scaling, Tamer-only bottom-security placement, actual moved-count scaling, and exact Tamer requirements while preserving Rule aliases; natural evolution, attacks, Blast, and cross-stack negatives prove it (`1e5113116`). |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 102
- Corrected: 29
- Provisional: 102
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 5 (`BT18-011`, `BT18-012`, `BT18-014`, `BT18-017` source-proof gaps; `BT18-041` catalog/KB DNA mismatch)
- Remaining unassigned: 0

BT18 static coverage is recorded. Scores remain provisional because execution gates were intentionally deferred.
