# BT21 collection revalidation plan

The authorized outcome is independently reproducible 10/10 evidence for all 102 committed BT21 cards, corrected implementations, synchronized collection data, green checks, atomic pushed commits, and an open review PR. This work stays on `audit-bt21-astra-luna`; historical completion reports are claims to challenge.

## Ownership and execution

- Astra owns decomposition, integration, review, all shared engine/helper edits, catalog synchronization, score aggregation, git delivery, and Orca status.
- Three `gpt-5.6-luna` agents with `fork_turns: none` own disjoint three-card batches. Each audits one card at a time and edits only its card module, colocated test, and per-card evidence document. Initial batches: 001–003, 004–006, 007–009. Subsequent batches continue 010–012 through 100–102, allocated only after each prior batch is reviewed.
- Agents read the exact committed catalog fields, local KB results and relevant rules, direct module, test, and historical range findings. They map every printed clause to executable IR and observable proof. They report shared gaps to Astra without editing shared files.
- Astra runs requested tests serially using `TEST_MAX_WORKERS=1`, `--maxWorkers=1 --no-file-parallelism --pool=forks`; no agent starts an independent test/build process. One test process at a time in this worktree limits load alongside five other collection worktrees.
- Production registration must exclusively use `registerIrCard(cardId, compiled)` with no duplicate legacy registration. No generated catalog or other collection edits by workers.

## Evidence and acceptance

`docs/audits/BT21-revalidation/catalog.json` preserves every catalog field in scope. `ledger.json` and `README.md` inventory every card using the existing five two-point categories. Each `cards/BT21-NNN.md` records sources/ruling identifiers, printed-clause mapping to named tests, positive and negative paths, costs, optional refusal, timing, target boundaries, zones, durations, inherited/Security effects, once-per-turn, traits, realistic legal stacks, commands/results, outstanding gaps, and delivery commit.

Public intents and settled observable game state are primary proof; manually injected events or static shape assertions supplement that proof. Legal evolution sequences and mixed trait pools must cover applicable stack/trait risks. A missing or ambiguous clause prevents 10/10. Minimal reusable engine fixes receive mechanism regressions and are integrated serially by Astra. Tests must detect the intended regression rather than merely restate IR shape.

## Gates and delivery

1. Inventory baseline and run the existing complete BT21 suite to identify current failures; save output.
2. Audit and correct all 34 small batches, recording per-card focused commands/results and unresolved mechanism requests. Review and commit each logical change atomically.
3. Run affected mechanism suites after each shared fix. Synchronize only BT21 with `pnpm effects:sync:set -- --set BT21`; verify with the corresponding check and full key equality test.
4. Re-run the final BT21 suite, all affected mechanisms, `pnpm typecheck`, applicable lint and format checks, tooling regressions when changed, and `git diff --check`. Persist logs and exact result counts.
5. Recalculate all 102 scores from evidence. Resolve every gap and independently review the integrated diff before assigning all delivery points. Push atomic commits and open an English review PR; never merge it.
6. Only after all criteria pass, update Orca with `COLLECTION COMPLETE: BT21; 100% 10/10; branch pushed` and complete the persistent goal. Meaningful intermediate checkpoints retain incomplete status.

Alternatives considered: rerunning old tests alone would not resolve historical proof gaps; a new collection-wide generic fixture suite would obscure card-specific failures. Colocated public-intent regressions preserve direct traceability while reusing the existing harness and engine seams.

## Second-pass checkpoint through BT21-055

Every catalog card has a first-pass evidence file. The independently reviewed second pass has integrated new public and stack proofs through 055, plus targeted corrections for 057/062/073/075/079/082 and reactive Options 091/093/094/100. The stable combined regression passes 1819 assertions across 121 files. These green counts do not settle all fidelity gaps; scores and pending clause reviews remain in the per-card ledger.

Next bounded work starts with Snatchmon/Vemmon 056–062 and resolves the remaining trait, placement/refusal, inherited return, and protection producers. Subsequent batches cover 063–082, then Tamers 083–090, then Options 091–102 with real Delay aging, trigger/controller boundaries, refusal, and cost proof. Earlier recorded gaps (notably 042 once-per-turn restoration, 038 target lock, 044 recovery timing, 051 Blast Digivolve, and public App Fusion access) remain explicit work items. Shared changes and all test/build execution stay serialized under Astra ownership.

## Second-pass checkpoint through BT21-084

Public and comparative proof additions through 084 are integrated. The current collection/mechanism gate passes 1878/1878 across 121 files, plus 1/1 grant-duration regression. Exact Gammamon evolution and no-target optional costs (069), and Owen's cost-before-binding order (081), are corrected with red-to-green public proof and synchronized IR. The collection remains incomplete at 515/1020 accepted points, with final delivery points withheld.

Continue with one-card Luna assignments 085, 086, 087, then 088–090 and reactive Options 091–102. After that pass, close the explicit earlier gaps (004/005, 038, 042, 044, 051, 055, 076, 077, 081 and remaining public App Fusion recipes/access) and perform the final clause audit of every ledger row. Recalculate all 102 rows and rerun final delivery gates only after those gaps close. Astra retains sole shared-engine, catalog, test/build, git, and integration ownership.
