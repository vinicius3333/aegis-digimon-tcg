# Printed token keyword mechanism

## Defect

`ContinuousEffectLedger.hasKeyword()` supports a live printed-keyword reader,
but `GameEngine` constructed the ledger with that dependency undefined. Combat
legality could parse a token's definition directly while the synchronized
observer/continuous API reported that the same token lacked its printed
keywords. EX7-058 exposed this split for the Volée & Zerdrücken token's
Blocker and Retaliation.

## Fix

`GameEngine` now binds the ledger reader to the live permanent. It returns the
keywords printed on the top card plus keywords printed in every stack card's
inherited text, using the existing memoized `printedKeywordsOf` parser. The
reader includes breeding permanents, returns an empty set for departed ids,
and does not create temporary grants or mutate the continuous ledger.

## Proof

- EX7-058 publicly creates the canonical token and observes both Blocker and
  Retaliation as ordinary passing assertions.
- The engine interaction suite continues to prove gained Retaliation behavior.
- The keyword parser suite remains green, including grant/reminder-text
  exclusions.

Verification: EX7-058, `interactionAudit`, and `combat/keywords` — **145/145
passed**; scoped Oxlint, Oxfmt, and `git diff --check` pass.
