# EX11 re-audit ledger — 2026-09-08

Base: 6d54ea4d7bccf9fa3ff13c05e3f163d196a3e01a. Prior scores are not inherited.

Current aggregate: 666/740; 0/74 cards at 10/10.

| Card     | Name                           | Catalog/rules | IR trace | Behavioral proof | Peer/stack | Gates | Total | Status |
| -------- | ------------------------------ | ------------- | -------- | ---------------- | ---------- | ----- | ----- | ------ |
| EX11-001 | Koromon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public host stack, accepted/declined attack evolution, negative destination, and cross-turn reset provide peer/stack proof; closing gates passed; branch publication pending |
| EX11-002 | Hiyarimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; focused green; closing gates passed; branch publication pending |
| EX11-003 | Puroromon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public second same-turn placement refuses draw and EX11-025 next-own-turn placement resets inherited OPT; Q5788 matcher retained; closing gates passed; branch publication pending |
| EX11-004 | Kapurimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public attack/security-check and EX11-025 turn-loop interaction replace synthetic placement/timing seams; closing gates passed; branch publication pending |
| EX11-005 | Yaamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-006 | Flickmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Public first inherited evolution, same-turn refusal, and next-own-turn legal level-5 EX11-033 evolution prove the shared OPT reset; focused 8/8 green; closing gates passed; branch publication pending |
| EX11-007 | Agumon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; focused green; closing gates passed; branch publication pending |
| EX11-008 | Elizamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public egg hatch/move and opponent security-check with competing EX11-057 Security effect prove complete stack interaction; closing gates passed; branch publication pending |
| EX11-009 | Tyrannomon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; catalog grammar correction queued; closing gates passed; branch publication pending |
| EX11-010 | MasterTyrannomon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; focused green; closing gates passed; branch publication pending |
| EX11-011 | Dinomon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public evolution deletion and real opponent-turn suspended-target attack boundaries join complete Q5796-Q5799 and stack proof; closing gates passed; branch publication pending |
| EX11-012 | Medusamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; realistic EX11-010 stack plus EX10-052, BT8-097, and BT2-099 public interactions prove cross-card behavior; closing gates passed; branch publication pending |
| EX11-013 | Sangomon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; legal production turn loop proves inherited OncePerTurn same-turn refusal and next-own-turn reset; closing gates passed; branch publication pending |
| EX11-014 | Penguinmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; focused green; closing gates passed; branch publication pending |
| EX11-015 | Frigimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; focused green; closing gates passed; branch publication pending |
| EX11-016 | PolarBearmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; focused green; closing gates passed; branch publication pending |
| EX11-017 | Skadimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; focused green; closing gates passed; branch publication pending |
| EX11-018 | Ryugumon | 2 | 2 | 2 | 2 | 1 | 9/10 | Public On Play with BT10-023, same-turn shared-use constraint, real opponent-to-own turn boundary, and next-own-turn attack with BT1-033 prove reset and second paid placement/unsuspend; focused 14/14 green; closing gates passed; branch publication pending |
| EX11-019 | Shoemon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; focused green; closing gates passed; branch publication pending |
| EX11-020 | Hanimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; realistic inherited stack plus ordinary and BT21-025 public attack peers prove timing, payment, and Q5803-Q5805 boundaries; closing gates passed; branch publication pending |
| EX11-021 | Kokeshimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; Puppet/ordinary/rejected evolution peers and ordinary/Progress attack interactions complete peer/stack proof; closing gates passed; branch publication pending |
| EX11-022 | Karakurumon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public entry, real P-185 end-turn ordering, delayed-delete identity, and Scapegoat attack proof replace injected seams; closing gates passed; branch publication pending |
| EX11-023 | Kaguyamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; production turn loops prove end-of-opponent-turn and own-turn boundaries with shared same-turn timing isolated by named driver; closing gates passed; branch publication pending |
| EX11-024 | Cendrillmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public turn loop proves Overclock Puppet deletion, attack declaration, and unsuspended attacker alongside complete immediate clauses; closing gates passed; branch publication pending |
| EX11-025 | FunBeemon | 2 | 2 | 2 | 2 | 1 | 9/10 | Reviewed; focused green; closing gates passed; branch publication pending |
| EX11-026 | Pteromon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public ordinary/security battles, competing deletion trigger, and cross-turn reset provide peer/stack proof; closing gates passed; branch publication pending |
| EX11-027 | Maquinamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public AD1-004 battle proves EX11-033 linked replacement, with accepted/rejected evolution and reveal peers; closing gates passed; branch publication pending |
| EX11-028 | Galemon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public Galemon/Shoto, ordinary/security battle peers, and cross-turn reset provide peer/stack proof; closing gates passed; branch publication pending |
| EX11-029 | Turbomon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public EX11-027 link source, Unchained play, and realistic EX11-031 inherited host provide complete peer/stack proof; closing gates passed; branch publication pending |
| EX11-030 | ForgeBeemon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public EX11-025 alternate evolution and face-up security check prove resident Reboot lifecycle alongside inherited host peers; closing gates passed; branch publication pending |
| EX11-031 | Vespamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public ST1-16 proves inherited Vespamon protects separate Royal Base EX11-030 and pays face-up security; closing gates passed; branch publication pending |
| EX11-032 | GrandGalemon | 2 | 2 | 2 | 2 | 1 | 9/10 | Public security battle against BT1-012 drains the optional decision queue and proves inherited EX11-032 unsuspends its surviving host after winning; 9/9 focused tests green; closing gates passed; branch publication pending |
| EX11-033 | Maneuvermon | 2 | 2 | 2 | 2 | 1 | 9/10 | Corrected public battle fixture uses a 12-cost target that survives EX11-034 pre-battle deletion, loses combat, enters trash, and the inherited EX11-033 watcher unsuspends its surviving host; 6/6 focused tests green; closing gates passed; branch publication pending |
| EX11-034 | QueenBeemon | 2 | 2 | 2 | 2 | 1 | 9/10 | Q5854 public proof recomputes the continuous layer: face-up EX11-025 grants Reboot during the opponent turn while in security and loses it after the security check consumes the card; focused/mechanism tests green; closing gates passed; branch publication pending |
| EX11-035 | Zephagamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Public suspension and attack producers play BT16-008 at the live raised DP ceiling; shared resolver and optional preflight use the same dynamic ceiling helper; focused and mechanism regressions green; closing gates passed; branch publication pending |
| EX11-036 | Dalphomon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public EX11-042 alternate stack, five-card Assembly matrix, free peer evolution, and inherited link-host boundary prove peer/stack behavior; closing gates passed; branch publication pending |
| EX11-037 | Espimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; real Kapurimon move stack and EX11-039 inherited host surviving higher-DP BT24-051 security prove peer/stack behavior; closing gates passed; branch publication pending |
| EX11-038 | Sunarizamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public BT13-061 Rock payment, Mineral/Rock peers, movement, and inherited discard replace injected timing and illegal fixtures; closing gates passed; branch publication pending |
| EX11-039 | HoverEspimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; accepted EX11-037 stack, rejected BT1-009 peer, and exact EX11-064 Altea interaction provide complete peer/stack proof; closing gates passed; branch publication pending |
| EX11-040 | Mulemon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; legal EX11-041 over EX11-040 over Maquinamon stack proves inherited Reboot through production opponent Active phase; closing gates passed; branch publication pending |
| EX11-041 | Oblivimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; accepted BT12-086 and rejected BT1-037 peers plus multi-card public security-check stack prove peer/stack behavior; closing gates passed; branch publication pending |
| EX11-042 | MockingBirdmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public Maquinamon links, cost-5/6 peers, inherited redirect host, decline, and non-inherited boundaries prove peer/stack behavior; closing gates passed; branch publication pending |
| EX11-043 | Invisimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public EX11-042 stack, cost peers, Security turn-loop entry, and promoted-stack recheck complete peer/stack proof; closing gates passed; branch publication pending |
| EX11-044 | Pyramidimon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public EX11-065 producer proves isSelfRef/byEffect negative boundary while complete direct behavior remains covered; closing gates passed; branch publication pending |
| EX11-045 | Metatromon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; no digivolve payment event proves free end-turn evolution; Assembly, EX11-027→029 stack, and BT19-024 placement provide peer proof; closing gates passed; branch publication pending |
| EX11-046 | Galacticmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; four-Vemmon Galacticmon resists public opponent EX11-026 suspension through production loop; hand/trash free evolution and Assembly peers pass; closing gates passed; branch publication pending |
| EX11-047 | Impmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-048 | Ghostmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public purple egg→Ghostmon→Soulmon stack and battle deletion prove inherited On Deletion, with seat-relative +1 as gauge -1; closing gates passed; branch publication pending |
| EX11-049 | Punkmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-050 | Loudmon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-051 | Necromon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete Q5904-Q5905 proof; closing gates passed; branch publication pending |
| EX11-052 | HeavyMetaldramon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof including Q5906; closing gates passed; branch publication pending |
| EX11-053 | Omekamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-054 | Owen Dreadnought | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-055 | Chitose Horaiji | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-056 | Ryutaro Williams | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public MasterTyrannomon, legal egg hatch, level boundary, memory boundary, and Security entry provide peer/stack proof; closing gates passed; branch publication pending |
| EX11-057 | Suzune Kazuki | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-058 | Yao Qinglan | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public EX11-050→018 Decode entry now triggers Yao suspension/restriction through combined entry window; ordinary/later evolution boundaries pass; closing gates passed; branch publication pending |
| EX11-059 | Reina Oumi | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete Q5913 proof; closing gates passed; branch publication pending |
| EX11-060 | Arisa Kinosaki | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-061 | Mirai Kinosaki | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete Q5915-Q5916 proof; closing gates passed; branch publication pending |
| EX11-062 | Shoto Kazama | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public Start Turn and Security play join effect/rule suspension peers and cross-turn duration proof; closing gates passed; branch publication pending |
| EX11-063 | Winr | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete Q5922-Q5927 proof; closing gates passed; branch publication pending |
| EX11-064 | Altea | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public Start Main and Security flows join Cyborg/non-Cyborg attack evolution and face-up scaling peers; closing gates passed; branch publication pending |
| EX11-065 | Close | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete applicable proof; closing gates passed; branch publication pending |
| EX11-066 | Xeno | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-067 | Dokuson Aruba | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public trash/decline/rejection/memory boundaries and breeding BT18-082 Q5934 interaction complete peer/stack proof; closing gates passed; branch publication pending |
| EX11-068 | Violet Inboots | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; Execute attackMechanic now survives whenAttacking payload and public BT20-072 evolves into EX11-051; non-Execute peer remains negative; closing gates passed; branch publication pending |
| EX11-069 | Yuuki | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public EX11-049→050 evolution, unchanged peer, hand controls, end-turn return, and Security entry complete peer/stack proof; closing gates passed; branch publication pending |
| EX11-070 | Unchained | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public accepted/declined exact-two-material DNA, Mind Link, inherited stack play, Security, and memory boundary complete pre-gate proof; closing gates passed; branch publication pending |
| EX11-071 | Cool Boy | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; complete card-specific proof; closing gates passed; branch publication pending |
| EX11-072 | Unique Emblem: Guardian Vortex | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; legal EX11-035 base makes public Shoto suspension activate Delay, trash emblem, and evolve into EX11-074 at reduced cost; closing gates passed; branch publication pending |
| EX11-073 | ExMaquinamon | 2 | 2 | 2 | 2 | 1 | 9/10 | Q5945 DNA correctly trashes link material before EX11-073 relinks it; Q5946 public EX11-070 Mind Link enters digivolution cards while linked remains empty; 9/9 focused tests green; closing gates passed; branch publication pending |
| EX11-074 | Vortexdramon | 2 | 2 | 2 | 2 | 1 | 9/10 | Re-reviewed; public BT1-070 opponent effect is blocked by Vortexdramon restriction; Piercing, direct battle, evolution peers, and immunity pass; closing gates passed; branch publication pending |
