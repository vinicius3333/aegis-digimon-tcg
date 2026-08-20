# BT4 implementation audit ledger — Luna medium

Scope: BT4-115 through BT4-001, audited in descending order against the committed catalog, local KB query, direct module/test paths, and committed compiled IR. The catalog, IR, KB, and BT4 index hashes at audit time are `dac8e0780dd3`, `bf96108c3ccb`, `34b8c0844b3f`, and `925f3874dac0` respectively.

The ten-point rubric was applied per card. Runtime approval is **not verified** for every card because the workspace has no installed `vitest` binary and `pnpm --filter @aegis/api exec vitest ...` ended with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` / `Command "vitest" not found`. No card is called 10/10 on this run. `corepack pnpm` is available, but dependencies are not installed. Typecheck is likewise not verified.

Hash columns are the first 12 hexadecimal characters of the SHA-256 of the direct module and colocated test. `—` means the card is represented by committed compiled IR and the colocated test, without a card-local direct module. `none` means no static blocker was found; it is not runtime approval.

| Card    | Name                            | Module SHA-256 | Test SHA-256 | Static blocker / score                                                                    |
| ------- | ------------------------------- | -------------: | -----------: | ----------------------------------------------------------------------------------------- |
| BT4-115 | Lucemon                         |   3dcf5f74663a | 871b72bd182f | none / not verified                                                                       |
| BT4-114 | AncientGarurumon                |   f8af3fd41a1a | 97a7860de389 | none / not verified                                                                       |
| BT4-113 | AncientGreymon                  |   1b50934a270b | a6960bbe8001 | none / not verified                                                                       |
| BT4-112 | Hell’s Gate                     |   a7147f6336c8 | dfa69a3b26ff | none / not verified                                                                       |
| BT4-111 | Jack Raid                       |   f74871174022 | 1c808e346b94 | none / not verified                                                                       |
| BT4-110 | Dark Roar                       |   7fd555ea3f16 | 59562c80888d | none / not verified                                                                       |
| BT4-109 | Final Zubagon Punch             |   f0e58469763d | cc162600408c | none / not verified                                                                       |
| BT4-108 | Cyclonic Kick                   |   2f1be6026bf5 | a52954cf6157 | none / not verified                                                                       |
| BT4-107 | Pollen Spray                    |   c6fb29f8a08d | b4407701a04b | none / not verified                                                                       |
| BT4-106 | Purge Shine                     |   766d6eeb7770 | 14d156b4f667 | none / not verified                                                                       |
| BT4-105 | Tactical Retreat!               |   96340164cff5 | e6ac51e2aa9e | none / not verified                                                                       |
| BT4-104 | Blinding Ray                    |   bddf5500e2b1 | 5413987219df | none / not verified                                                                       |
| BT4-103 | Full Moon Blaster               |   f0646ef96026 | 3b22a8fdb07d | none / not verified                                                                       |
| BT4-102 | Aqua Viper                      |   d9e1d0aa3254 | 6de11ed87958 | none / not verified                                                                       |
| BT4-101 | I'll Drag You In to the Depths! |   6d6aec57918a | 939c1f877e47 | none / not verified                                                                       |
| BT4-100 | Trident Revolver                |   7306760b5b07 | dfafe2604a2c | none / not verified                                                                       |
| BT4-099 | Heir of Dragons                 |   0ab3b5ae560d | 9c2e12385e4a | none / not verified                                                                       |
| BT4-098 | Atomic Inferno                  |   125feadf03dd | ab01d0a4f456 | compiled IR partial/residual 1; direct module covers Main + Security / not verified       |
| BT4-097 | Kari Kamiya                     |   bb8dceae62cd | ca8550100671 | none / not verified                                                                       |
| BT4-096 | Izzy Izumi                      |   9227b6a0f875 | 9b385192a026 | compiled IR partial/residual 1; direct module covers ordering / not verified              |
| BT4-095 | Yoshino Fujieda                 |   73277ac52202 | 801f55346938 | compiled IR partial/residual 2; direct module covers egg deck + reducer / not verified    |
| BT4-094 | Tai Kamiya                      |   512ce98e7ed0 | 8846df3bda14 | none / not verified                                                                       |
| BT4-093 | Thomas H. Norstein              |   aeec2dbecf62 | 0837140870c9 | none / not verified                                                                       |
| BT4-092 | Marcus Damon                    |   97ee8d02aedf | 7436e7030bc3 | none / not verified                                                                       |
| BT4-091 | Chaosmon: Valdur Arm            |   7e3283d736c4 | 76bf4be8e1be | none / not verified                                                                       |
| BT4-090 | Chaosmon                        |   2af5bed4fa54 | 4d9d2203226f | none / not verified                                                                       |
| BT4-089 | Plutomon                        |   d66889b98594 | a8e0302f2f09 | none / not verified                                                                       |
| BT4-088 | DanDevimon                      |   da321672df4b | 0ddb4142fc30 | none / not verified                                                                       |
| BT4-087 | Anubismon                       |   3b9e7c803a2a | a8e35e77a987 | none / not verified                                                                       |
| BT4-086 | Cerberusmon: Werewolf Mode      |   f1023bfa69b8 | 1b95f7499a01 | none / not verified                                                                       |
| BT4-085 | Phantomon                       |              — | 17bd9f266f0f | no direct module; IR full / not verified                                                  |
| BT4-084 | NeoDevimon                      |   13a15e354079 | 8b4639ed1c7e | none / not verified                                                                       |
| BT4-083 | Cerberusmon                     |   4b17c6e9c724 | 2a93bd483c59 | none / not verified                                                                       |
| BT4-082 | Dobermon                        |              — | 08f578128295 | no direct module; IR full / not verified                                                  |
| BT4-081 | Devimon                         |   269078b3d5dc | 52c9a0f30dd5 | none / not verified                                                                       |
| BT4-080 | Bakemon                         |              — | 45f5367e0a97 | no direct module; IR full / not verified                                                  |
| BT4-079 | Labramon                        |   654effdadc4e | 148dd6e784cd | none / not verified                                                                       |
| BT4-078 | Soundbirdmon                    |   dd4ee59a58e4 | b81184cb4eba | none / not verified                                                                       |
| BT4-077 | Ghostmon                        |   32a8183e37fa | 8a85de09072a | none / not verified                                                                       |
| BT4-076 | Gabumon                         |              — | 858d95046d82 | no direct module; IR full / not verified                                                  |
| BT4-075 | Blastmon                        |   b567e3636a12 | 555cf1c04834 | none / not verified                                                                       |
| BT4-074 | Darkdramon                      |   8275a9e389bc | 1eb0c89ebc3c | none / not verified                                                                       |
| BT4-073 | BanchoGolemon                   |   a4c93c0920a5 | 4e7de23732e2 | none / not verified                                                                       |
| BT4-072 | Gogmamon                        |   b6a66cfdab91 | 679b45186d81 | none / not verified                                                                       |
| BT4-071 | Tankdramon                      |   7c68f2c01a0f | b58ad01940f8 | none / not verified                                                                       |
| BT4-070 | Meteormon                       |   1b46919f8401 | 15fac3f70fe3 | none / not verified                                                                       |
| BT4-069 | Blimpmon                        |              — | 089d70bd89cc | no direct module; IR full / not verified                                                  |
| BT4-068 | Baboongamon                     |   ee627c9b408e | 85d576cc09eb | none / not verified                                                                       |
| BT4-067 | Sealsdramon                     |   f81cf13e9148 | a2f38caf3476 | none / not verified                                                                       |
| BT4-066 | Golemon                         |   d569f10edb44 | 498a60f9f49c | none / not verified                                                                       |
| BT4-065 | Gotsumon                        |              — | 9f27677e3a56 | no direct module; IR full / not verified                                                  |
| BT4-064 | Sunarizamon                     |   7cbed0629d57 | ed02b6516234 | none / not verified                                                                       |
| BT4-063 | Commandramon                    |   040db74c146c | 823e2ecc37ca | none / not verified                                                                       |
| BT4-062 | Nidhoggmon                      |   7542edeb0f69 | 9e00b605db89 | none / not verified                                                                       |
| BT4-061 | BanchoLeomon                    |   372c68dfefa3 | 08d4ec3fe802 | none / not verified                                                                       |
| BT4-060 | Lotosmon                        |   a5fb59f4a430 | 54b5779500b6 | none / not verified                                                                       |
| BT4-059 | Lilamon                         |   4e087ed8ff10 | e64f114bdab2 | none / not verified                                                                       |
| BT4-058 | Orochimon                       |   aa2a3cfb3671 | 6cf296f2d886 | none / not verified                                                                       |
| BT4-057 | GrapLeomon                      |   f203463c61b4 | 660e79d02876 | none / not verified                                                                       |
| BT4-056 | SkullScorpiomon                 |              — | e3bd961d1a0a | no direct module; IR full / not verified                                                  |
| BT4-055 | Leomon                          |   17e0586e9f09 | 1d31d9453820 | none / not verified                                                                       |
| BT4-054 | Sunflowmon                      |   82e09275900a | 7cb38c6841d5 | none / not verified                                                                       |
| BT4-053 | Roachmon                        |              — | 4aaa168b4adb | no direct module; IR full / not verified                                                  |
| BT4-052 | Lalamon                         |   d40e4024ae30 | 181b163ce93e | none / not verified                                                                       |
| BT4-051 | DoKunemon                       |   21b6e5cee4e7 | 237bba80fc0f | none / not verified                                                                       |
| BT4-050 | Liollmon                        |              — | b6c7f1a565b1 | no direct module; IR full / not verified                                                  |
| BT4-049 | Varodurumon                     |   5688f1f945bf | 68a22a033c3e | none / not verified                                                                       |
| BT4-048 | WarGreymon                      |   8d93e4a8476a | 1926ed73d48c | none / not verified                                                                       |
| BT4-047 | Rasielmon                       |   fb3c7aaf619d | 5e970c1d0ae4 | none / not verified                                                                       |
| BT4-046 | WarGrowlmon                     |   b439da2ae59c | 3cd3d3799513 | none / not verified                                                                       |
| BT4-045 | Maycrackmon                     |   a6a1bb8ed9ac | 4fdf56bbd9ce | none / not verified                                                                       |
| BT4-044 | HippoGryphonmon                 |   9f4b681d5d0d | f17eb8e190c5 | none / not verified                                                                       |
| BT4-043 | Crowmon                         |              — | 9a7bee9d70a2 | no direct module; IR full / not verified                                                  |
| BT4-042 | Piddomon                        |   7a727cc8f7d7 | 4b440a9fda77 | none / not verified                                                                       |
| BT4-041 | Meicoomon                       |   8bc27d2b036c | 49bbd034ac59 | none / not verified                                                                       |
| BT4-040 | Diatrymon                       |              — | 749f0d8f65e6 | no direct module; IR full / not verified                                                  |
| BT4-039 | Growlmon                        |   503771246ba6 | ca83d7516986 | none / not verified                                                                       |
| BT4-038 | BushiAgumon                     |   68980af9dd1b | 2c8c0c9aa33e | none / not verified                                                                       |
| BT4-037 | Kudamon                         |   27656bec4bee | 07c79abc8648 | none / not verified                                                                       |
| BT4-036 | Falcomon                        |              — | 44c83a1deaf4 | no direct module; IR full / not verified                                                  |
| BT4-035 | MirageGaogamon                  |   62ea649ea061 | aa8996b4d59c | none / not verified                                                                       |
| BT4-034 | Regalecusmon                    |   5addfa2597c8 | 2d0a666c9c04 | none / not verified                                                                       |
| BT4-033 | ZeedGarurumon                   |   8a5ee0a3bc9d | 6f4f2b8cf1af | none / not verified                                                                       |
| BT4-032 | MachGaogamon                    |   046f825800fb | db49f8b66b4b | none / not verified                                                                       |
| BT4-031 | MarinChimairamon                |   4f6d3d511188 | 9501e3348fd7 | none / not verified                                                                       |
| BT4-030 | Beowolfmon                      |   8a4fb5a59bc6 | a788aa16fd3c | compiled IR none/residual 1; direct restriction module + strengthened test / not verified |
| BT4-029 | Gusokumon                       |              — | 3d6c45b8df0d | no direct module; IR full / not verified                                                  |
| BT4-028 | Piranimon                       |   a39c01042e6c | ebf676ad0338 | none / not verified                                                                       |
| BT4-027 | KendoGarurumon                  |   02b24e240982 | 4d5781ddfd9f | none / not verified                                                                       |
| BT4-026 | GaoGamon                        |   77238f764f16 | 85016144405d | none / not verified                                                                       |
| BT4-025 | Lobomon                         |   a6a865005bf6 | 10afe4019e93 | none / not verified                                                                       |
| BT4-024 | Tobiumon                        |              — | ad4fb9a466a8 | no direct module; IR full / not verified                                                  |
| BT4-023 | Strabimon                       |   b77013546879 | e5b3bf233af6 | none / not verified                                                                       |
| BT4-022 | Sangomon                        |              — | 82c0deaa6a68 | no direct module; IR full / not verified                                                  |
| BT4-021 | Gaomon                          |   96193037850d | 99a4f9f3dd87 | none / not verified                                                                       |
| BT4-020 | ShineGreymon                    |   4ad7e07cafbf | 70df3a8aa264 | none / not verified                                                                       |
| BT4-019 | VictoryGreymon                  |   3cbd82216e7d | 0702f2460e06 | none / not verified                                                                       |
| BT4-018 | Spinomon                        |   6da79ac0d913 | 7e09b1b6b09f | none / not verified                                                                       |
| BT4-017 | RizeGreymon                     |   e0cce71abd0a | 75ea499ac9dc | none / not verified                                                                       |
| BT4-016 | Aldamon                         |   b91371a08cd1 | ac774125c768 | none / not verified                                                                       |
| BT4-015 | Volcdramon                      |   c0dfe3e93909 | fdd756afc898 | none / not verified                                                                       |
| BT4-014 | Vermilimon                      |              — | d555e7c22490 | no direct module; IR full / not verified                                                  |
| BT4-013 | BurningGreymon                  |   033706dbb643 | 431d8be0eff1 | none / not verified                                                                       |
| BT4-012 | GeoGreymon                      |   5c16c3c3bc07 | 3bcf61ae13ae | none / not verified                                                                       |
| BT4-011 | Agunimon                        |   af6b7fbf5439 | 598c84a31b1a | none / not verified                                                                       |
| BT4-010 | Fugamon                         |              — | 0be2f6832e28 | no direct module; IR full / not verified                                                  |
| BT4-009 | Flamemon                        |   c82770d694ee | 655abd0da087 | none / not verified                                                                       |
| BT4-008 | Agumon                          |   caff39cc114b | d2ff8e66c8b4 | none / not verified                                                                       |
| BT4-007 | Otamamon                        |              — | b7394323647f | no direct module; IR full / not verified                                                  |
| BT4-006 | Xiaomon                         |   e3072de955dc | f2668039f7a4 | none / not verified                                                                       |
| BT4-005 | Missimon                        |   6f317c9734ef | e0184f3ad912 | none / not verified                                                                       |
| BT4-004 | Budmon                          |   7dfe1d7d22aa | a98434a3c65a | none / not verified                                                                       |
| BT4-003 | Koromon                         |   a1ebbe0bda29 | a163b3f5d344 | none / not verified                                                                       |
| BT4-002 | Bukamon                         |   c6f279a390a6 | 97f5237e5ccd | none / not verified                                                                       |
| BT4-001 | Sakuttomon                      |   e7226245f5a9 | 8d43115e76f8 | none / not verified                                                                       |

## Evidence and blockers

- Catalog inventory: 115 BT4 records, all with a colocated `.test.ts`.
- Compiled IR inventory: 115 records; 111 `full`, four with residuals (`030`, `095`, `096`, `098`). The residuals are stale relative to their hand-written direct modules and were not silently promoted to full.
- Direct modules: 97 registered in `apps/api/src/cards/BT4/index.ts`; 18 cards use the committed IR module path and have no card-local `.ts`.
- KB queries were run per card in descending order. Cards with no local Q&A are recorded as having no KB entry; absence is not treated as positive evidence.
- Focused serial Vitest was attempted with the requested low-memory/fork settings and could not start because `vitest` is not installed. `pnpm typecheck` was not run to a passing conclusion for the same dependency-installation blocker.
- The only source/test change in this audit is the BT4-030 colocated behavioral test. No other collection was edited. No metadata/index mutation was performed.
- Delivery blocker: the requested atomic commit could not be written because this worktree's external Git database is read-only in the sandbox. The normal index was not changed; the temporary-index `read-tree`/`write-tree` path was attempted and failed before object insertion.
