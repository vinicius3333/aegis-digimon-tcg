# Timing activation restrictions: BT23-028 Q5258–Q5262

Coordemon's linked restriction was honored by ordinary When Digivolving collection but bypassed by reactivation. The public EX6-043 Diaboromon probe produced a token despite the restriction. The corrected restricted/control pair now produces zero/one token respectively.

`effects/timingActivation.ts` owns the shared predicate. Unconditional `cannotActivateWhenDigivolving` and `activateOnPlay` restrictions take priority over effect immunity. Timing-disable masks retain their existing `beAffected` bypass. Ordinary effect collection, GameAccess, primitives, targeted reactivation and compiled reactivation/borrowing use this predicate. Borrowed stack effects use the activating host; battle-area lenders retain their identity; loose/security lenders fall back to the activating host. Borrowed effects revalidate after selection before the body or its usage is recorded.

Targeted reactivation filters disabled choices before prompting and checks the selected candidate again after an awaited decision. It preserves Main/OnDeclaration effects, which have no corresponding timing mask. Own compiled ReactivateEffect propagates the borrowed printed timing to its execution context.

Mechanism regressions include: unconditional restriction plus immunity; mask plus immunity control; targeted On Play and When Digivolving suppression; unchanged memory/body/usage while suppressed; Main preservation; adding a restriction during a real pending chooseOption and responding through a public intent; and a public BT23-060 attack borrowing BT23-015's On Play from face-up security, with restricted/control victim survival/deletion. Synthetic registrations are isolated engine seams and restored after each test. Audited production modules remain exclusively registered through registerIrCard.

The public Coordemon suite additionally proves paid Link, linked DP, non-Appmon rejection, legal yellow evolution and physical draw, Security battle/end-of-battle play, exact-one opposing DP reduction, 3000/4000 boundaries, real modifier expiry, restriction expiry, TigerVespamon's by-placement cost and tail suppression/control, and shared When Attacking activation without a turn reset.

Validation:

- Exact 11-file command in BT23-028.md: 129/129 passed (`logs/timing-activation-integration-final.log`). This includes BT23-028, BT23-060, BT19-038, P-095, EX6-043, EX9-073, BT22-092, reactivation, timing gate, restriction-consumer guard, and restriction enforcement suites. Every Vitest process used one worker and disabled file parallelism.
- `pnpm typecheck`: shared/API/web passed (`logs/typecheck-timing-activation.log`). Final API-only typecheck follows the small typed legacy-metadata guard cleanup (`logs/typecheck-timing-activation-api-final.log`).
- Applicable Oxlint: zero findings (`logs/timing-activation-lint.log`). Oxfmt check: all nine changed TypeScript files correctly formatted (`logs/timing-activation-format.log`). `git diff --check`: clean.
- Generated card metadata is unaffected by this engine change. The independently pending BT23-029 card edit will be synchronized in its own integration.

This closes the bounded activation defect, not the collection audit. Angemon's multiple Alliance timing and Barrier/source-play ordering remain separate retained regressions. Full BT23 and final collection delivery gates remain pending.
