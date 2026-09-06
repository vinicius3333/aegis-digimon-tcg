# ST22 Proof Audit

Evidence was checked against the committed catalog, local rules knowledge base,
registered IR, and colocated Vitest tests. Commands use the serial fork pool.

| Card                         | Proof coverage                                                                                                                                                                  | Score |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| ST22-01 Viximon              | inherited Option-use trigger, exact reduction of 3, a second matching Option excluded by the once-per-turn gate, legal evolution stack and neutral draw deck                    | 10/10 |
| ST22-02 Renamon              | hand cost, optional trash/trait recovery, Barrier inheritance                                                                                                                   | 10/10 |
| ST22-03 Kyubimon             | top-three name/trait reveal and bottom remainder, Barrier inheritance                                                                                                           | 10/10 |
| ST22-04 Taomon               | On Play/When Digivolving DP reduction and timing lock; attack Option use limited to hand/under Tamers with both traits; inherited top-security cost and once-per-turn unsuspend | 10/10 |
| ST22-05 Sakuyamon            | Alliance payment and two security checks, token creation, hand/under-Tamer Option use, refusal, and normal/alternate Counter evolution                                          | 10/10 |
| ST22-06 Sakuyamon: Maid Mode | Option/security-removal trigger, lowest-DP bottom-security cost, top-security trash, reduced evolution, and exclusive hand/under-Tamer use sources                              | 10/10 |
| ST22-07 Rika Nonaka          | placement/draw/memory, attack trigger cost and level ceiling, Security play                                                                                                     | 10/10 |
| ST22-08 Offensive Plug-In V  | color waiver, link then DP-bound deletion, Security lowest-DP deletion and hand return                                                                                          | 10/10 |
| ST22-09 High-Speed Plug-In H | color waiver, link, suspend restriction and Security return                                                                                                                     | 10/10 |
| ST22-10 Amethyst Mandala     | Security DP effect, replacement prevention cost, draw and face-up bottom-security placement                                                                                     | 10/10 |
| ST22-11 Defense Plug-In F    | color waiver, Security De-Digivolve 2, working Link recipient, same-target Reboot/+3000 DP, real opponent Active unsuspend and expiry                                           | 10/10 |
| ST22-12 DoGatchmon           | App Fusion requirement, real Raid redirect to highest-DP unsuspended opponent, once-per-turn trait link cost reduction                                                          | 10/10 |
| ST22-13 GrandGalemon         | Fortitude replay and no-source negative, real end-turn Vortex, optional suspend/+3000 DP, inherited Vortex Warriors unsuspend and opposing-unsuspended negative                 | 10/10 |
| ST22-14 Barbamon             | separate hand/trash cost reduction, hand trimming and conditional lowest-level deletion                                                                                         | 10/10 |

## Corrections and evidence

- An isolated ST22-05/09 scenario proved the own blue Option color waiver was suppressed under a Tamer. A blue-source control worked; the yellow-only board failed before the narrow shared placement fix. The fixed route links the exact Option instance and completes Alliance security checks. Kernel controls keep other buried printed statics inactive.
- ST22-04 rejected Plug-In because its final Option filter still required Onmyōjutsu. ST22-04 and ST22-06 also used the broader digivolution-card zone, allowing Options under Digimon. Eight source/trait cases reproduced four failures before the IR corrections and passed afterward.
- ST22-11 used unsupported `linkTo`, causing Main to throw. It now supplies `recipient`; the temporary DP binds to the chosen Reboot recipient. The resolved link and full next-opponent-turn duration scenario passes.
- Full ST22 passed 19 files / 68 tests in the coordinator collection regression. All 14 cards recalculate to 10/10 across catalog, rules, direct IR, resolved behavior and validation gates. Final combined conformance results are recorded in the overall closeout. All commands explicitly use `--pool=forks --maxWorkers=1 --no-file-parallelism`.
