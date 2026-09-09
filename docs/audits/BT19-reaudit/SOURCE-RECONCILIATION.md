# BT19 catalog corrections versus official list

| Card | Field | Catalog before | Correction | Action |
| --- | --- | --- | --- | --- |
| BT19-001 | inheritedEffectText | `... [Blue Flare] trait rom your hand ...` | `... trait from your hand ...` | Corrected in cards.json (session 1) |
| BT19-002 | types | `Aquatic` | Printed `[Aqua]/[Sea Animal]` per lane 1 | Not edited; `traitContains` matches either; verify against official list before changing |
| BT19-017 | effectText | Missing `[Rule] Trait: Has the [Aquatic] type.` (types already carried Aquatic) | Appended, same form as BT19-019; confirmed by Q3073 | Corrected in cards.json (session 1) |
| BT19-022 | effectText | `with the [Blue Flare] from your trash` | `with the [Blue Flare] trait from your trash` (printed) | Corrected in cards.json (session 1) |
| BT19-026 | effectText | `[Blue Flare]/[Xros Heart] trait trait Digimon card` | single `trait` | Corrected in cards.json (session 1) |
| BT19-025, BT19-026 | effectText/inheritedEffectText | U+00A0 in place of spaces (several); `＜Rush＞for the turn` lacks a space | Matches upstream import; not edited | Tests normalize U+00A0 |
| BT19-030 | inheritedEffectText | `[Once Per Turn]When you use` (missing space) | Cosmetic | Not edited |
| BT19-046 | effectText | stray U+00A0 before `opponent's [Data]` | Cosmetic | Not edited; test normalizes |
| BT19-076 | effectText | `from among to your hand` | `from among them to your hand` | Corrected in cards.json (session 1) |
| BT19-076 | evoCosts | `[]` on a Lv5 (only the `[Digivolve][Shademon]` route) | Plausible for a White Digimon; not verified against the physical card | Not edited |
| BT19-077 | effectText | double spaces instead of newlines between clauses | Cosmetic | Not edited |
| BT19-095 | effectText | `When this card is trashed in your battle area ... for the turn` and `[Main] ... for the turn` | `When an effect trashes this card in your battle area ... until the end of your opponent's turn` in both clauses, matching BT19-093, BT19-098, P-159 and Q3170 | Corrected in cards.json (session 1); physical card not independently checked, verify against the official list |
