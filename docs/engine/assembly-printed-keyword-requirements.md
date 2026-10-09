# Assembly printed-keyword requirements

## Contract

An Assembly material slot may require a keyword printed in the card's main effect portion. This is a definition-level predicate: inherited effects, linked effects, continuous grants, and the current host's resolved keyword set do not qualify the loose trash card.

`AssemblyMaterial.printedKeywords` expresses this requirement structurally. The Assembly matcher uses the shared printed-keyword definition check, preferring compiled non-inherited keyword declarations and falling back to the catalog's main `effectText`. Every listed keyword is conjunctive with the slot's color, level, kind, name, and trait predicates.

A printed-keyword predicate is itself a sufficient structured anchor for a slot. This allows recipes such as “Black Lv.5 with Blocker” without inventing a broad text search or a name/trait placeholder.

## Q7412/Q7413 regression

Craniamon EX13-062 requires one Black Lv.5, Lv.4, and Lv.3 card, each with Blocker in its main text. A normal printed-Blocker material such as Guardromon BT2-058 remains valid. Bokomon EX13-050, whose Blocker appears only in inherited text, is rejected.

Covered by `engine/actions/assemblyPrintedKeywords.test.ts` and the focused EX13-062 Q7412/Q7413 test.
