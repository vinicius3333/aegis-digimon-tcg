# BT26-073–104 Re-audit

Audited independently against `packages/shared/src/cards/data/cards.json`, the
local KB (`node tools/kb/query.mjs card <ID>`), each direct module, its focused
test, and the shared effect primitives. The catalog endpoint is BT26-104. Every
module contains exactly one `registerIrCard` call and no `registerCard` call.

All cards below are `10/10`: catalog clauses map to full compiled IR with an
empty residual list, and the focused behavioral suite passes. Focused tests
were run one card at a time with Vitest 5, `--pool=threads --no-file-parallelism`.

| Card     | Catalog contract checked                                                                                                                                                                                         | Focused proof | Score |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------: | ----: |
| BT26-073 | Aegiomon evolution; Assembly -2 Chronomon-text/TS Lv.4-or-lower; self-delete or Shaman/TS trash-bottom cost; opposing Lv.5-or-lower deletion; TS hand/trash play on deletion; Wizard rule; Security A. +1        |            13 | 10/10 |
| BT26-074 | Alternate Lv.4 TS evolution; owner-turn On Play/When Digivolving/When Attacking shared once-per-turn Titan Option use with hand-trash and -2; inherited lowest-level deletion                                    |            13 | 10/10 |
| BT26-075 | Glowing Dawn evolution; Execute/Ascension; Security On Deletion bottom face-down Tamer cost and free play of a play-cost-5-or-lower Glowing Dawn card; Option behavior                                           |             9 | 10/10 |
| BT26-076 | DATA SQUAD evolution; Lv.4-or-lower deletion plus Tamer-stack cost/opponent hand trash; Your Turn once-per-turn reduced Ravemon/DATA SQUAD trash evolution; inherited Avian/Bird/DATA SQUAD play                 |            10 | 10/10 |
| BT26-077 | DM evolution; Security A.+1/Execute/Fragment (2); once-per-turn Ver.3 trash play with face-down-card ceiling; highest-play-cost Digimon/Tamer deletion                                                           |            11 | 10/10 |
| BT26-078 | TS evolution; Trash Your Turn Chronomon/Titan reaction with opponent-memory threshold; self return and Rush/Execute grants; optional self-delete cost-12-or-lower Chronomon/Titan trash play                     |            12 | 10/10 |
| BT26-079 | Plutomon/TS evolutions and Assembly; Trash reduced play; Decode/Retaliation/Security A.+1; three independent deletion timings; all-turns once-per-turn hand trim                                                 |            16 | 10/10 |
| BT26-080 | Bacchusmon evolution; Succession/Security A.+1; suspend cost and attack without suspending; once-per-turn same-orientation deletion                                                                              |            12 | 10/10 |
| BT26-081 | Minervamon/TS evolution and Assembly; up-to-8 Iliad play; per-Iliad/TS Digimon/Tamer DP reduction; continuous Iliad Alliance/Reboot/Blocker/+2000                                                                |            10 | 10/10 |
| BT26-082 | Crowmon/DATA SQUAD evolution; Security/end-opponent-turn play; End of Attack/When Digivolving highest-DP deletion via self-delete or two bottom face-down cards; discard then optional bottom-security placement |            18 | 10/10 |
| BT26-083 | TS evolution/Junomon Assembly; Rush/Piercing/Execute/Decode; security wipe, per-card deletion, Recovery +3; deletion Security A.-1                                                                               |            11 | 10/10 |
| BT26-084 | Appmon evolution; Detach Seven Code; linked once-per-turn top-3 reveal and reduced play/use; remainder top/bottom; trash link behavior                                                                           |            12 | 10/10 |
| BT26-085 | Five different-level Chronomon-text/Shaman Assembly; Collision/Reboot/Blocker; opponent-effect DP/stack-trash protection; departure replacement into Destroy Mode                                                |            11 | 10/10 |
| BT26-086 | Seven differently named Seven Code Assembly; Rush/Reboot/Blocker/Link +6; up-to-7 distinct Appmon links; linked deletion and seven-link top-security-to-deck-bottom                                              |            10 | 10/10 |
| BT26-087 | TS-trash-bottom start-main memory and optional Giant Slayer recovery; TS hand-trash Draw 2; Security free play                                                                                                   |             7 | 10/10 |
| BT26-088 | Conditional start-main memory; Boss/TS play-cost reduction with no-Digimon +2 branch; Your Turn suspension; Security play                                                                                        |             9 | 10/10 |
| BT26-089 | BEATBREAK face-down Tamer placement Draw/memory; all-turns security-removal placement and effect-only Security A.-1; Security play                                                                               |             9 | 10/10 |
| BT26-090 | Start-main memory threshold; End-of-Turn suspended TS Option use with opponent-memory reduction; Security play                                                                                                   |            11 | 10/10 |
| BT26-091 | DATA SQUAD face-down placement Draw/memory; opponent suspension/self-stack-trash reaction; suspended reduced Vegetation/Fairy/DATA SQUAD evolution; Security play                                                |            13 | 10/10 |
| BT26-092 | TS hand-trash Draw/memory; opponent-turn attack redirect with TS Tamer return cost; optional cost-only path without target; Security play                                                                        |             9 | 10/10 |
| BT26-093 | BEATBREAK face-down placement Draw/memory; attack reaction, deck placement, own BEATBREAK Collision/Blocker grants; Security play                                                                                |            10 | 10/10 |
| BT26-094 | DATA SQUAD face-down placement Draw/memory; opponent hand-trash/self-stack-trash reaction; Execute grant; Security play                                                                                          |            10 | 10/10 |
| BT26-095 | BEATBREAK face-down placement Draw/memory; any-Digimon deletion reaction; Draw then hand trash then non-Digi-Egg BEATBREAK placement; Security play                                                              |            10 | 10/10 |
| BT26-096 | Start-turn memory set; self deck-bottom return; reduced Chronomon-text Digimon/TS Tamer play from hand/trash; Security play                                                                                      |             8 | 10/10 |
| BT26-097 | Security-scaled use cost; named-Tamer Aegiomon material; requirement-ignoring Jupitermon evolution and optional Aegiochusmon top-card placement; Security TS play/add                                            |             8 | 10/10 |
| BT26-098 | Bottom face-down Tamer reduction; atomic Sunflowmon+Lilamon placement and free Rosemon evolution; Security Lalamon/Yoshino play/add                                                                              |             8 | 10/10 |
| BT26-099 | DM Use Requirement; reveal/add and remainder bottom; battlefield placement; face-down-card Delay for free Lv.6-or-lower DM evolution; Security Main                                                              |             9 | 10/10 |
| BT26-100 | No-face-up-security color waiver; Titan Blocker and conditional +3000; Main security exchange and Lv.4-or-lower Titan play; Security Titan play                                                                  |             9 | 10/10 |
| BT26-101 | TS Use Requirement; named-Tamer TS Blocker/+3000; independent DP-bounded deletion/unsuspend modal; Security TS play                                                                                              |             9 | 10/10 |
| BT26-102 | Seven Code Use Requirement; atomic six-card mixed-source placement and free Dantemon evolution; Security Appmon play/add                                                                                         |             8 | 10/10 |
| BT26-103 | Olympos XII evolution; Piercing/Reboot/Blocker/Succession; Counter recovery; all-turns once-per-turn opponent-Digimon -15000 on either security-removal event                                                    |             8 | 10/10 |
| BT26-104 | Start-main memory; Shambala hand-trash Draw 2; end-turn Tentei Hachibushu-gated Shambala Option use; Security play                                                                                               |            10 | 10/10 |

## Shared semantics and exception

The tested shared seams include Assembly/name-or-trait matching, exact trait and
kind filters, bottom face-down Tamer-stack costs, paid/reduced use and evolution,
security movement and visibility, attack redirection, deletion timing, inherited
source placement, once-per-turn identity, optional refusal, and atomic multi-card
costs. Focused tests include realistic evolution stacks and mixed positive and
negative candidate pools for the applicable cards.

BT26-074 initially failed only in a test fixture using BT26-075 as its host. That
host has Ascension and a Security [On Deletion] effect; automatic selection moved
the host to security before the inherited 074 effect resolved, correctly stranding
the inherited source because its deleted host was no longer in trash. The fixture
now uses legal TS Lv.6 host BT26-046 for the source-placement proof. BT26-075's own
full choice ordering remains covered by its focused tests. Q7100 explicitly states
that if Ascension is activated first and the deleted card leaves trash, the other
pending effects on that card cannot activate; BT26-074 now asserts that accepted
Ascension leaves both opposing Digimon alive. No shared engine change was made.

The related BT26-053 and BT26-057 proofs include public combat flows: BT26-053
uses a BT26-003 redirection with separate Tamer-stack cost cards for both effects,
while BT26-057 uses an explicit Blocker declaration so its target-switch watcher
is isolated from Tamer-trash events.

## Verification

```text
32 focused files, run individually: PASS (333 tests; BT26-074 rerun after proof addition)
registerIrCard-only structural audit for BT26-073..104: PASS (32/32)
git diff --check: PASS
```

No unresolved card limitation remains in this range. No commit was made; the
parent agent owns delivery.

## Integrated verification — 2026-09-06

All cards in this range passed in the final 104-file, 993-test collection run. The current per-card test counts and collection recalculation are recorded in `BT26-REAUDIT-20260905.md`. The detailed inspection above and the linked direct tests supply clause evidence; passing counts alone do not establish fidelity.

The BT26-074/BT26-075 Ascension case is explicitly a mechanism fixture, not proof of a normal evolution route. The primary inherited-deletion case uses BT26-046 over BT26-074, legal through the Lv.5 TS alternate requirement. BT26-070 uses BT26-074 over its purple Lv.4 source, legal through the ordinary purple evolution requirement.
