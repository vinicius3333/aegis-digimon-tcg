# EX11 source reconciliation

Official source: <https://world.digimoncard.com/cards/?category=522034&search=true>, fetched 2026-09-08. The coordinator parsed 74 distinct base card entries and matched every official Q&A number to the committed local KB index. Special evolution, DNA, Assembly, Security, rule-trait, and reminder-text fields are compared separately from ordinary effect text so presentation differences do not become false defects.

## Confirmed corrections

| Card | Catalog before | Official source | Resolution |
| --- | --- | --- | --- |
| EX11-009 | `[All Turns] This Digimon get +1000 DP.` | `[All Turns] This Digimon gets +1000 DP.` | Corrected the catalog grammar. Executable behavior was already faithful. |

## Pending card-lane reconciliation

Every remaining apparent text difference is held pending its card lane. Most current differences are expected formatting: special evolution or Assembly headers stored inline, keyword reminder text omitted from the catalog, and official rule-trait sentences represented in the catalog `types` or name metadata. A card receives contract credit only after its lane confirms those fields individually.
