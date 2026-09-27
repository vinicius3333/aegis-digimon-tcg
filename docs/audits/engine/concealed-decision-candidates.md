# Concealed decision candidates

Discord report 1553625807094808700 concerns BT13-033 MirageGaogamon: Burst Mode. The catalog and KB Q2285/Q2286 require the activator to choose/order without looking, while the hand owner privately inspects the selected cards.

Oracle production log `api-2026-09-27-a011d6d2-d535-43fc-9997-07fc7ab54a87.jsonl`, match `240a655c-cd19-4537-ae9c-fe438149e08b`, room `4jf80b1uf`, 2026-09-27 04:32:10Z, `dec-34`: fourteen selectable IDs, zero visible IDs, min/max six. The frontend treated zero visible IDs as zero tiles. The payload also contained seven identities inferred from previously face-up hand cards. Both failures were reproduced before changing production code: rendered regression expected ten clickable backs but got zero; the strengthened real card test expected no identities but received six.

`decisionVisibleCards` now renders the union of visible and selectable IDs, preserving concealment for IDs omitted from the explicit visible list even if a previous client index remembers them. `withCardIdentities` fills only the explicit visible list when present. `orderCards` accepts the same visibility boundary, which the hidden return cost carries through after owner inspection. Existing instance IDs remain the server's selection handles; this change does not introduce a new transport identity scheme.

The arena `arena-mirage-hidden-hand` reproduces fourteen hand positions (seven previously revealed), six blind picks, private owner inspection, blind ordering, eight remaining cards, and successful unsuspension/security attack. No card behavior registration changed.

Peer review: BT19-075 MoonMillenniummon and EX8-063 use owner-chosen hand trash, so their owners must continue seeing identities. The MoonMillenniummon regression explicitly verifies all seven candidates and identities reach seat 1. Only BT13-033 currently declares `selectionHidden`; other hidden-zone selections and revealed nonselectable inspection cards use the shared renderer and decision identity seams.

Validation: 14 API files / 681 tests passed (card/decision, state visibility, interpreter/capability, arena integration and audit-document gates). Five frontend files / 353 tests passed (rendered selection/ordering, board model, decision overlay/contract/presentation). Full workspace `pnpm typecheck`, scoped `oxlint`, scoped `oxfmt --check` and `git diff --check` passed.
