# Alliance lifecycle audit

## Bounded public proof (2026-09-12)

Source: `comprehensive-0243`, §16-24-1, fingerprint
`e44a7d2f8998a34292f9974cbca448cd81f2fbf538af8c3db0e1def0b7b44f2b`.
The rule requires an attacking Digimon to suspend one of its other Digimon and
add that ally's DP for the attack. The cost is controller-owned, requires an
eligible other Digimon, and is optional at the attack decision.

`apps/api/src/engine/conformance/keyword-alliance-consent.test.ts` uses the
printed `AD1-009` provider. Its accepting case presents two eligible physical
allies, responds with the exact second ally from the prompt's two exposed IDs,
and verifies that only that ally is suspended and the opposing 16,000-DP
Digimon is deleted. The 12,000-DP printed attacker cannot defeat that defender
with the 3,000-DP ally but can with the 5,000-DP ally. Its refusal case
uses the same two eligible allies, declines the public Alliance response, and
verifies both allies remain ready while the attack completes and consumes the
exact first security instance. The proof waits for attack completion and an
empty pending decision; it does not claim every Alliance grant or duration
shape.

Existing public providers cover additional source forms:

| Form           | Executable evidence                                                                                            | Bounded result                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Printed native | `apps/api/src/engine/conformance/keyword-alliance-consent.test.ts`, `apps/api/src/cards/BT19/BT19-014.test.ts` | Exact ally choice/refusal, suspension, battle/security resolution            |
| Inherited      | `apps/api/src/cards/ST20/ST20-04.test.ts`                                                                      | Host stack inherits Alliance and resolves chosen ally across security checks |
| Runtime grant  | `apps/api/src/cards/ST20/ST20-06.test.ts`, `apps/api/src/cards/BT26/BT26-033.test.ts`                          | Public grant consumers open Alliance and accept an exact ally                |

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/engine/conformance/keyword-alliance-consent.test.ts src/cards/BT19/BT19-014.test.ts src/cards/ST20/ST20-04.test.ts src/cards/BT26/BT26-033.test.ts
```

Result: **4 files / 24 tests passed**. Scoped Oxfmt, Oxlint and
`git diff --check` passed for the new conformance file. Multiple-ally ordering,
supporter changes/removal, duplicate Alliance instances, nested effect battles,
and all other printed/granted/inherited parameter combinations remain open.
