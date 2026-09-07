# BT22 independent collection re-audit

Date: 2026-09-06. Baseline: a924de971e0b43ad9ebd8f82a454d495ff880a60. Status: incomplete.

## Authority and acceptance

All 102 committed BT22 catalog records are in scope. Historical reports in docs/audits/BT22-AUDIT.md, docs/audits/BT22-STATIC-AUDIT.md and internal-docs/audits/BT22 are claims to independently revalidate. The catalog, data/kb card Q&A/errata/restrictions and applicable comprehensive rules define the contract. No unresolved or ambiguous clause earns 10/10. Initial zero scores mean unverified in this run, not proven defective.

## Implementation plan

1. Inventory all catalog fields, modules and tests in ledger.json; preserve baseline and historical scores separately.
2. Dispatch batches of at most four cards to three gpt-5.6-luna workers using fork_turns none. Each worker audits one card at a time, reads the exact catalog record, queries local KB, traces shared primitives, strengthens public-intent behavioral tests and writes its card evidence file.
3. Workers own only assigned BT22 modules, colocated tests and unique evidence files. The lead owns shared engine code/tests, harnesses, generated catalogs, this ledger, scoring, Git staging/commits/push and PR. Workers report minimal mechanism gaps with repros; no concurrent shared-file edits.
4. Use focused public-intent/settled observable state proofs for every printed clause, timing, optional refusal, payment, targets, zones, duration, inherited/security effects, once-per-turn, trait comparisons, legal evolution routes and invalid stacks. Record any unavailable public route and its precise limitation. Add mutation/revert evidence where useful to establish causal proof.
5. Lead integrates each card or coherent fix atomically, serializes minimal reusable engine changes with mechanism regressions, and reruns affected cards. No legacy or duplicate registerCard in audited production modules.
6. Lead synchronizes/checks only BT22 using pnpm effects:sync:set -- --set BT22 and pnpm effects:check:set -- --set BT22. Check semantic changes outside BT22 are absent.
7. Independently challenge each completed batch, recalculate all 102 rows from per-card evidence, then run focused, affected mechanism, full BT22, typecheck, applicable lint/format and git diff --check gates. Scores use Catalog/rules, IR trace, Behavioral proof, Peer/stack, Delivery (0–2 each); final delivery credit waits for current aggregate gates and pushed commits.
8. Push atomic commits to audit-bt22-astra-luna, open an English review PR without merging, and update Orca only after all collection gates pass. Partial batches remain incomplete.

## Resource and coordination policy

All test commands use --pool=forks --maxWorkers=1 --no-file-parallelism. Each worker runs at most one focused process at once. Lead schedules whole collection/build checks after workers pause tests, so the worktree never runs more than three test workers and broad checks do not overlap. No global catalog regeneration, worktree switching, main push, force push, rebase or PR merge. Meaningful checkpoints update Orca.

## Evidence conventions

Each evidence/<CARD-ID>.md records catalog/KB clauses and IDs, clause-to-IR mapping and shared seams, exact behavioral test names/commands/results, public action and observable assertions, legal/invalid stack and mixed-trait peers, regressions, outstanding gaps, and provisional component scores. Lead owns delivered commit mapping and collection ledger recalculation. Logs live under logs/ when referenced as evidence.

## Batch queue and inventory

| Batch | Card     | Name                           | Kind    | Initial state |
| ----- | -------- | ------------------------------ | ------- | ------------- |
| 1     | BT22-001 | Puyoyomon                      | DigiEgg | pending       |
| 1     | BT22-002 | Kyaromon                       | DigiEgg | pending       |
| 1     | BT22-003 | Tapmon                         | DigiEgg | pending       |
| 1     | BT22-004 | Wanyamon                       | DigiEgg | pending       |
| 2     | BT22-005 | Tsumemon                       | DigiEgg | pending       |
| 2     | BT22-006 | Moonmon                        | DigiEgg | pending       |
| 2     | BT22-007 | Mother Eater                   | DigiEgg | pending       |
| 2     | BT22-008 | Agumon                         | Digimon | pending       |
| 3     | BT22-009 | Effecmon                       | Digimon | pending       |
| 3     | BT22-010 | Meramon                        | Digimon | pending       |
| 3     | BT22-011 | BlueMeramon                    | Digimon | pending       |
| 3     | BT22-012 | RizeGreymon                    | Digimon | pending       |
| 4     | BT22-013 | WarGreymon                     | Digimon | pending       |
| 4     | BT22-014 | Gaiomon                        | Digimon | pending       |
| 4     | BT22-015 | Omnimon                        | Digimon | pending       |
| 4     | BT22-016 | Mcmon                          | Digimon | pending       |
| 5     | BT22-017 | Gabumon                        | Digimon | pending       |
| 5     | BT22-018 | Sangomon                       | Digimon | pending       |
| 5     | BT22-019 | Veemon                         | Digimon | pending       |
| 5     | BT22-020 | KausGammamon                   | Digimon | pending       |
| 6     | BT22-021 | Shellmon                       | Digimon | pending       |
| 6     | BT22-022 | Veedramon                      | Digimon | pending       |
| 6     | BT22-023 | AeroVeedramon                  | Digimon | pending       |
| 6     | BT22-024 | MarineBullmon                  | Digimon | pending       |
| 7     | BT22-025 | UlforceVeedramon               | Digimon | pending       |
| 7     | BT22-026 | MetalGarurumon                 | Digimon | pending       |
| 7     | BT22-027 | Ryugumon                       | Digimon | pending       |
| 7     | BT22-028 | Ariemon                        | Digimon | pending       |
| 8     | BT22-029 | Shoemon                        | Digimon | pending       |
| 8     | BT22-030 | Musimon                        | Digimon | pending       |
| 8     | BT22-031 | GoldNumemon                    | Digimon | pending       |
| 8     | BT22-032 | ShoeShoemon                    | Digimon | pending       |
| 9     | BT22-033 | Mediamon                       | Digimon | pending       |
| 9     | BT22-034 | Reppamon                       | Digimon | pending       |
| 9     | BT22-035 | Entermon                       | Digimon | pending       |
| 9     | BT22-036 | Chaperomon                     | Digimon | pending       |
| 10    | BT22-037 | Chirinmon                      | Digimon | pending       |
| 10    | BT22-038 | Monzaemon                      | Digimon | pending       |
| 10    | BT22-039 | Ouranosmon                     | Digimon | pending       |
| 10    | BT22-040 | Cendrillmon                    | Digimon | pending       |
| 11    | BT22-041 | Kentaurosmon                   | Digimon | pending       |
| 11    | BT22-042 | Nyabootmon                     | Digimon | pending       |
| 11    | BT22-043 | Terriermon                     | Digimon | pending       |
| 11    | BT22-044 | Palmon                         | Digimon | pending       |
| 12    | BT22-045 | WezenGammamon                  | Digimon | pending       |
| 12    | BT22-046 | Gargomon                       | Digimon | pending       |
| 12    | BT22-047 | Kuwagamon                      | Digimon | pending       |
| 12    | BT22-048 | Togemon                        | Digimon | pending       |
| 13    | BT22-049 | Vegiemon                       | Digimon | pending       |
| 13    | BT22-050 | Roamon                         | Digimon | pending       |
| 13    | BT22-051 | Okuwamon                       | Digimon | pending       |
| 13    | BT22-052 | Leopardmon                     | Digimon | pending       |
| 14    | BT22-053 | Keramon                        | Digimon | pending       |
| 14    | BT22-054 | Hagurumon                      | Digimon | pending       |
| 14    | BT22-055 | Recomon                        | Digimon | pending       |
| 14    | BT22-056 | Guardromon                     | Digimon | pending       |
| 15    | BT22-057 | Kurisarimon                    | Digimon | pending       |
| 15    | BT22-058 | Dreammon                       | Digimon | pending       |
| 15    | BT22-059 | Infermon                       | Digimon | pending       |
| 15    | BT22-060 | Datamon                        | Digimon | pending       |
| 16    | BT22-061 | Vademon                        | Digimon | pending       |
| 16    | BT22-062 | MetalTyrannomon (X Antibody)   | Digimon | pending       |
| 16    | BT22-063 | Alphamon                       | Digimon | pending       |
| 16    | BT22-064 | Diaboromon                     | Digimon | pending       |
| 17    | BT22-065 | PlatinumNumemon                | Digimon | pending       |
| 17    | BT22-066 | Raidenmon                      | Digimon | pending       |
| 17    | BT22-067 | LordKnightmon                  | Digimon | pending       |
| 17    | BT22-068 | Agumon (X Antibody)            | Digimon | pending       |
| 18    | BT22-069 | Lunamon                        | Digimon | pending       |
| 18    | BT22-070 | DarkTyrannomon (X Antibody)    | Digimon | pending       |
| 18    | BT22-071 | Devimon                        | Digimon | pending       |
| 18    | BT22-072 | Lekismon                       | Digimon | pending       |
| 19    | BT22-073 | Crescemon                      | Digimon | pending       |
| 19    | BT22-074 | SkullMeramon                   | Digimon | pending       |
| 19    | BT22-075 | Fakemon                        | Digimon | pending       |
| 19    | BT22-076 | ShinMonzaemon                  | Digimon | pending       |
| 20    | BT22-077 | Dianamon                       | Digimon | pending       |
| 20    | BT22-078 | Boltmon                        | Digimon | pending       |
| 20    | BT22-079 | Eater (Species Form)           | Digimon | pending       |
| 20    | BT22-080 | Eater (Human Form)             | Digimon | pending       |
| 21    | BT22-081 | Eater Eve                      | Digimon | pending       |
| 21    | BT22-082 | Eater Adam                     | Digimon | pending       |
| 21    | BT22-083 | Yuuko Kamishiro                | Tamer   | pending       |
| 21    | BT22-084 | Nokia Shiramine                | Tamer   | pending       |
| 22    | BT22-085 | Rina Shinomiya                 | Tamer   | pending       |
| 22    | BT22-086 | Yao Qinglan                    | Tamer   | pending       |
| 22    | BT22-087 | Torajiro Asuka                 | Tamer   | pending       |
| 22    | BT22-088 | Arisa Kinosaki                 | Tamer   | pending       |
| 23    | BT22-089 | Mirei Mikagura                 | Tamer   | pending       |
| 23    | BT22-090 | Rie Kishibe                    | Tamer   | pending       |
| 23    | BT22-091 | Arata Sanada                   | Tamer   | pending       |
| 23    | BT22-092 | Jimmy KEN                      | Tamer   | pending       |
| 24    | BT22-093 | Ami Aiba                       | Tamer   | pending       |
| 24    | BT22-094 | Yuugo Kamishiro                | Tamer   | pending       |
| 24    | BT22-095 | Akemi Suedou                   | Tamer   | pending       |
| 24    | BT22-096 | Unique Emblem: Poseidia Lagoon | Option  | pending       |
| 25    | BT22-097 | Music of the Heart             | Option  | pending       |
| 25    | BT22-098 | Unique Emblem: Fable Waltz     | Option  | pending       |
| 25    | BT22-099 | Kuremi Detective Agency        | Option  | pending       |
| 25    | BT22-100 | Cyberspace EDEN                | Option  | pending       |
| 26    | BT22-101 | Kyoko Kuremi                   | Tamer   | pending       |
| 26    | BT22-102 | Sayo                           | Tamer   | pending       |
