# EX12-049–001 Audit Wave

## EX12-049 through EX12-001

The committed catalog and local knowledge-base queries were checked serially for every card in this range. The local KB has no card-specific entries for these IDs, so the catalog text and shared engine semantics are the controlling evidence.

Static review found and corrected these clause-to-IR gaps:

- EX12-001 now requires this VB Digimon plus one other Digimon, binds the DNA result, and restricts the follow-up attack to that result.
- EX12-005, EX12-012, and EX12-038 no longer mark mandatory “By trashing” costs as optional.
- EX12-010 constrains both recovery windows to the owner’s trash.
- EX12-013, EX12-027, EX12-041, EX12-043, and EX12-050 model “play or use 1” as one mutually exclusive choice, with Options routed through use rather than play.
- EX12-037 and EX12-042 share their printed once-per-turn budgets across their multiple timing windows.

The remaining cards’ evolution requirements, keywords, timing windows, filters, boundaries, inherited effects, and zone transitions map to executable IR without unresolved residuals. Focused Vitest execution was attempted serially with the low-memory Corepack pnpm fallback, but the workspace does not contain a Vitest binary. `git diff --check` passed.
