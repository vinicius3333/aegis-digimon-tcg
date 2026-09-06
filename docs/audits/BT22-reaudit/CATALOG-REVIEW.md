# BT22 catalog review

This is a source correction checkpoint, not collection certification. Runtime and card-specific behavioral gates remain pending.

The lead compared all 102 unique BT22 entries against the [official English collection page](https://world.digimoncard.com/cards/?category=522030&search=true) on 2026-09-06. Parsed fields, including separate special evolution conditions and card Q&A, are preserved in `logs/official-catalog-fields.json`. The ledger preserves printed evolution routes separately because the catalog's numeric color/level `evoCosts` cannot express Appmon form requirements.

## Confirmed corrections

| Card     | Catalog correction                                                                                  | Supporting official entry                                                        |
| -------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| BT22-002 | Restore In-Training form.                                                                           | [Kyaromon](https://world.digimoncard.com/cards/?card_no=BT22-002&search=true)    |
| BT22-009 | Restore Appmon link requirement costing 2.                                                          | [Effecmon](https://world.digimoncard.com/cards/?card_no=BT22-009&search=true)    |
| BT22-011 | Main play effect accepts Flame or CS, not only Flame.                                               | [BlueMeramon](https://world.digimoncard.com/cards/?card_no=BT22-011&search=true) |
| BT22-014 | Restore the rule that its name also has Greymon.                                                    | [Gaiomon](https://world.digimoncard.com/cards/?card_no=BT22-014&search=true)     |
| BT22-015 | Restore CS level 6 evolution costing 5 and the named Greymon/Garurumon level 6 DNA route costing 0. | [Omnimon](https://world.digimoncard.com/cards/?card_no=BT22-015&search=true)     |
| BT22-016 | Restore Appmon link costing 1 and correct the search trait to Awakening.                            | [Tubemon](https://world.digimoncard.com/cards/?card_no=BT22-016&search=true)     |
| BT22-030 | Restore Appmon link costing 1.                                                                      | [Roamon](https://world.digimoncard.com/cards/?card_no=BT22-030&search=true)      |
| BT22-033 | Restore Appmon link costing 2.                                                                      | [Fakemon](https://world.digimoncard.com/cards/?card_no=BT22-033&search=true)     |
| BT22-035 | Restore Appmon link costing 3.                                                                      | [Entermon](https://world.digimoncard.com/cards/?card_no=BT22-035&search=true)    |
| BT22-049 | Correct the DM level 3 evolution cost from 3 to 2. The English card image independently confirms 2. | [Vegiemon](https://world.digimoncard.com/cards/?card_no=BT22-049&search=true)    |
| BT22-075 | Restore Appmon link costing 3.                                                                      | [Scopemon](https://world.digimoncard.com/cards/?card_no=BT22-075&search=true)    |

Form-based evolution routes identified for direct IR verification: BT22-009, 033, 035, 039, 050, 058, and 075. They must be expressed using exact form traits and proven with differently colored legal bases and invalid near peers. Merely preserving the ordinary color/level requirement is insufficient.

## Source discrepancy resolved without changing behavior

BT22-028 Ariemon's English HTML effect omits its once-per-turn tag. Both the [official English card image](https://world.digimoncard.com/images/cardlist/card/BT22-028.png) and [official Japanese card image](https://digimoncard.com/images/cardlist/card/BT22-028.png) visibly include it. The catalog's once-per-turn restriction is retained. Auditors must not remove it based on the HTML omission.

The Aquatic rule traits on BT22-018/021/024/027 and Dinosaur rule trait on BT22-062 are already flattened into the catalog's `types`. BT22-079's expanded deck limit is already represented by `maxCountInDeck`. Their missing reminder sentences do not alone establish missing runtime behavior; the existing metadata and its behavioral use still need verification.

## Validation

The shared catalog rebuild passed (`logs/shared-catalog-rebuild-2.log`). Shared card tests and scoped semantic validation are recorded in `logs/catalog-shared-tests.log` and `logs/catalog-scope-check.log`. These checks do not certify the remaining BT22 effects. Set-scoped effects synchronization remains a separate integration gate.
