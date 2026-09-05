# EX11 catalog source correction — 2026-09-05

Baseline main: 675edc356. Existing 77 files / 609 EX11 tests passed in 146.79s,
showing that the old tests did not detect the following incorrect source text.

## Verified semantic corrections

- EX11-029: first trigger is When Moving, not On Play.
- EX11-033: first trigger is When Moving, not On Play. Its first effect plays
  exactly Maquinamon from hand or its own link cards to the battle area. It does
  not link a card, take digivolution cards, or choose a recipient Digimon.
- EX11-042: retains On Play / When Digivolving, but likewise plays Maquinamon
  from hand or its own link cards. Existing Link action was incorrect.

Sources inspected:

- https://world.digimoncard.com/cards/?category=522034&search=true
- https://world.digimoncard.com/cards/?card_no=EX11-033&search=true
- https://digimoncard.com/cards/?card_no=EX11-033&search=true
- https://world.digimoncard.com/cards/?card_no=EX11-042&search=true

Japanese EX11-033 text and Q5850 confirm movement and playing from link cards.
The English Q5850 answer itself mentions On Play inconsistently; the Japanese
answer confirms When Moving. This does not justify inventing a play-as-link
mechanism. Existing ordinary Play and WhenMoving IR are the appropriate seams;
behavioral proof must establish source scoping, On Play resolution and rule checks.

## Text corrections

Remove erroneous trait suffixes after the exact names Shoemon (020) and Shoto
Kazama (028). Repair the malformed Omnimon (X Antibody) name, quantity and security
condition typos in 053, and duplicated trait phrase in 062.

The official Rule trait additions for 013/014/018/030/031/034/035/038/050 are already
present in committed `types`; they are not new missing engine traits. Reminder
text and equivalent punctuation differences do not independently prove defects.

## Special play conditions omitted by the prior catalog

The official set's separate Special Play Condition field prints Assembly for
EX11-036 (five green Digimon with Maquinamon in text, reduction 5), EX11-045
(five black Digimon with Maquinamon in text, reduction 5), and EX11-046 (eight
cards with Vemmon in text, reduction 6). None was in the committed card text.
All three headers are now represented in effectText using the catalog's normal
Assembly notation. Compiled requirements and public Assembly action tests now enforce these clauses.
Source: https://world.digimoncard.com/cards/?category=522034&search=true

## Additional evolution corrections

Official special evolution fields also restore Machine alongside Cyborg for
EX11-041 (Lv4, cost3), correct EX11-052's Dark Dragon/Evil Dragon Lv5 cost to4,
and restore EX11-073 DNA (Green Lv6 + Black Lv6, cost0). All 74 printed DP,
play-cost, level and color values, plus 48 ordinary evolution rows, were
compared with the official set listing and matched the catalog. Special Link
metadata on EX11-027 was already present.

Final implementation and gate results are in the current collection report.
