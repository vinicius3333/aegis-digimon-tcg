# EX11 collection audit — 2026-09-05

All 74 cards were re-audited in `audit-ex11-20260905` from main `675edc356`.
The recalculated ledger is [apps/api/src/cards/EX11/AUDIT.md](../../apps/api/src/cards/EX11/AUDIT.md).
Three requested Luna workers supplied the range reviews; the coordinator reviewed
shared changes, official source discrepancies, regression fixtures and delivery.

## Findings and resulting behavior

| Scope            | Correction and observable proof                                                                                                                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX11-029/033     | Printed When Moving replaces On Play. Colocated movement and negative timing cases cover the boundary.                                                                                                                                                                                                                  |
| EX11-033/042     | Play exact Maquinamon from hand or this Digimon's link cards, with its own On Play window. Own evolution cards and another host's links are excluded. `EX11-link-play-rule-check.test.ts` proves Q5850/Q5878: losing linked DP can delete the host before Maquinamon may relink; a surviving host can receive the link. |
| Exact identities | Bracketed names now use exact matching in effects and evolution routes. EX11-006 rejects ExMaquinamon as Maquinamon; EX11-032 rejects GrandGalemon as Galemon. Intentional Tyrannomon/Lucemon name substrings remain.                                                                                                   |
| EX11-036/045/046 | Restore omitted Assembly requirements: five green/black Maquinamon-text Digimon for −5; eight Vemmon-text cards for −6. Public play intents prove exact counts, trash-only sources, colors, text/kind boundaries, duplicates, and memory. EX11-046 accepts eligible Digimon, Tamer and Option materials.                |
| Shared Assembly  | Optional material colors are enforced with any printed color matching. Existing requirements without colors retain their behavior. Multicolor EX11-027 is eligible for either color requirement.                                                                                                                        |
| EX11-041         | Restore Machine alongside Cyborg in the Lv4 cost 3 alternate route. Machine-only Clockmon proves the route; a nonmatching Lv4 pays its ordinary cost 4.                                                                                                                                                                 |
| EX11-052         | Dark Dragon/Evil Dragon Lv5 alternate cost is4. Public evolution with both traits proves memory 10→6 and the resulting stack. Reverting cost 3 reproduced both failures (received 7 instead of 6).                                                                                                                      |
| EX11-073/070     | Restore Green Lv6 + Black Lv6 DNA at cost 0. Public DNA tests reject wrong colors/levels and preserve both material identities. Unchained's DNA scenario now uses legal materials and retains memory.                                                                                                                   |
| EX11-074         | Shoto Kazama's controller requirement accepts Digimon or Tamer kind, consistent with CR16-42-3. Existing route and missing-controller/base cases cover it.                                                                                                                                                              |
| EX11-025/030     | Resolve the prior Security Reboot ambiguity: resident Security effects require face-up security (CR15-14-5-1). Supplemental tests prove face-down copies do not grant Reboot.                                                                                                                                           |
| Catalog          | Correct misleading exact-name trait suffixes (020/028), malformed 053 text and duplicated 062 text; restore special Assembly/evolution headers.                                                                                                                                                                         |
| Persisted IR     | Regenerate all 74 EX11 entries and verify module equality and set scope.                                                                                                                                                                                                                                                |

## Sources and per-card evidence

The [official EX11 set listing](https://world.digimoncard.com/cards/?category=522034&search=true)
was checked for all 74 cards, including its separate special evolution and play
condition fields. DP, play cost, level, colors and 48 ordinary evolution rows
matched the catalog. Rule trait additions were already represented in card types.

The previous EX11-033 exception was based on incorrect source text. The
[Japanese card and Q5850](https://digimoncard.com/cards/?card_no=EX11-033&search=true)
confirm When Moving and ordinary play from link cards. The English Q5850 answer
uses an inconsistent trigger label; the printed text and Japanese ruling resolve it.
[EX11-042/Q5878](https://world.digimoncard.com/cards/?card_no=EX11-042&search=true)
confirms the corresponding play and DP rule-check ordering. No new play-as-link
engine mechanism is required.

Current clause maps and focused evidence:

- [EX11-001–025](../../internal-docs/audits/EX11/2026-09-05-001-025.md)
- [EX11-026–050](../../internal-docs/audits/EX11/2026-09-05-026-050.md)
- [EX11-051–074](../../internal-docs/audits/EX11/2026-09-05-051-074.md)
- [Catalog source reconciliation](../../internal-docs/audits/EX11/2026-09-05-catalog-findings.md)

Historical September 1 reports are retained as snapshots, explicitly superseded.
Their old scores and unrelated engine hypotheses are not current EX11 findings.

## Reproducible gates

Run from the repository root. All listed checks must pass for the final 74/74 score.

| Command                                                                                                                                                                                                                                                                                                                                                                                                                              | Result                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX11 --maxWorkers 2`                                                                                                                                                                                                                                                                                                                                                             | 81 files / 649 tests passed                                   |
| `pnpm --filter @aegis/api exec vitest run src/engine/conformance/ch07-playing-a-card.test.ts src/engine/actions/assemblyColors.test.ts src/engine/actions/assemblySkullGreymon.test.ts src/engine/cards/bt26Assembly.test.ts src/engine/ruleCheckPool.test.ts src/engine/effects/mindLink.test.ts src/engine/conformance/ch15-04-continuous-and-static.test.ts src/engine/effects/digivolveCandidateLegality.test.ts --maxWorkers 2` | 8 files / 61 tests passed                                     |
| `pnpm --filter @aegis/shared exec vitest run src/effects/digivolutionRequirementsFor.test.ts`                                                                                                                                                                                                                                                                                                                                        | 106 tests passed                                              |
| `NODE_OPTIONS=--max-old-space-size=4096 npm_config_workspace_concurrency=1 pnpm typecheck`                                                                                                                                                                                                                                                                                                                                           | shared, API and web passed; API repeated after final fixtures |
| `NODE_OPTIONS=--max-old-space-size=4096 pnpm effects:check:set -- --set EX11 --base 675edc356`                                                                                                                                                                                                                                                                                                                                       | All 74 persisted records match; no changes outside EX11       |
| Targeted `pnpm exec oxlint`, `pnpm exec oxfmt --check`, `git diff --check`                                                                                                                                                                                                                                                                                                                                                           | Passed                                                        |

The collection includes 74 focused card suites, inventory/registration and persisted
IR checks, Vortex integration, and four supplemental behavioral suites. Every card
registers only through registerIrCard, has full compiled coverage and no residual.
No unresolved EX11 clause remains in this audit. The broader engine suite was not
run; the shared change was checked with the listed mechanism regressions.
