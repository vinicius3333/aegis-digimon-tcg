# BT25 official-source comparison

Astra compared all 104 distinct BT25 records against the [official English card list](https://world.digimoncard.com/cards/?category=522036&search=true) on 2026-09-06 after finding that historical tests faithfully implemented incorrect catalog text. The comparison separates normal reminder/punctuation differences from contract differences. The local catalog and KB remain the primary repository inputs, but a contradictory printed source must be resolved before scoring 10/10.

Confirmed corrections under integration:

| Card | Discrepancy                                      | Action                                                           |
| ---- | ------------------------------------------------ | ---------------------------------------------------------------- |
| 021  | Thomas was treated as a trait rather than a name | Catalog and IR corrected; older Thomas regression red then green |
| 023  | Extra trait word after Thomas                    | Catalog corrected; existing IR already uses a name               |
| 024  | Crescemon source zone said hand instead of trash | Catalog corrected; Luna owns IR and reversed zone proof          |

Additional discrepancies queued for the owning card audit; they are **not resolved** by this document:

| Card(s)                                          | Difference requiring review                                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 029                                              | Alternate evolution uses Gaogamon in the name, broader than the catalog's MachGaogamon                                           |
| 048                                              | Evolution discount requires a green TS destination; catalog omits green                                                          |
| 038                                              | Catalog omits the TS alternate and two-color DNA requirement text                                                                |
| 103                                              | Catalog omits the TS alternate and red/blue DNA requirement text                                                                 |
| 104                                              | Catalog omits the DATA SQUAD alternate and ShineGreymon/Marcus Burst requirement text                                            |
| 036, 052, 056, 060, 070, 072                     | Catalog omits the explicit linked-card stacking sentence in App Fusion requirements                                              |
| 019, 025, 038, 042, 050, 053, 055, 059, 069, 103 | Printed Rule trait sentence is omitted; runtime types may already encode it, requiring per-card trace and behavioral trait proof |
| 039, 094, 095, 097, 099, 102                     | Face-up security location notation is flattened into an ordinary Security marker; verify continuous-zone semantics independently |

Keyword reminder text, whitespace, punctuation, “cost” versus “play cost” in an explicit play instruction, and equivalent wording differences are not treated as engine defects by this scan. The per-card audit still validates their actual behavior. The source check does not itself prove any card correct.

Reproduction inputs were downloaded read-only to `/tmp/bt25-audit-logs/official-bt25.html`. The diagnostic extractor split each `popupCol` by its exact ID, collected `dt`/`dd` text, normalized whitespace and punctuation, and compared effect, inherited and security fields. It selected each BT25 ID once and excluded later non-BT25 promo entries. Outputs: `official-records.json`, `catalog-official-differences.txt`, and `compare-official.py` in the same temporary directory. These diagnostic files are not generated production catalogs; the linked official source and the explicit discrepancies above make the inspection reproducible if temporary files expire.

## Shakkoumon correction staged during the next batch

The official BT25-038 popup's special condition is Lv.4 TS for3, with YellowLv.4 + Blue/BlackLv.4 DNA for0. Astra added both lines and the printed Rule Angel sentence to the catalog; existing runtime types already included Angel. Luna corrected the module's alternate and DNA requirements. Typed source counts and full behavioral boundary review remain pending before approval.

The official BT25-048 Bearmon effect specifically requires a **green** TS destination. The catalog now retains that color boundary, matching the direct IR correction and public non-green rejection. BT25-036 Craftmon now retains the official App Fusion sentence specifying that two named cards must already be linked and that the link card is stacked on top before evolution. Source: the same official English BT25 page and the saved per-card records used above.
