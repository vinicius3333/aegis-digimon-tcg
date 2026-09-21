---
title: Printed keyword card filters
updated: 2026-09-20
---

# Printed keyword card filters

## Contract

A definition-level `keywords` filter used for loose cards matches a keyword
printed on the main portion of that card. It does not match a keyword that is
present only in inherited-effect text, and it does not match a keyword granted
by another effect. EX13-047 Q7368 states this boundary explicitly for
`＜Blocker＞`.

Board-permanent keyword checks remain separate: they may inspect inherited and
currently granted keywords through the live permanent matcher.

## Implementation trace

`definitionMatches` delegates positive keyword filters to
`definitionHasKeyword`. The compiled-IR path now ignores effects marked
`isInherited`, and the catalog fallback scans only `effectText`. Definition-level
`excludeKeywords` uses the same main-text boundary. `textHasKeyword` itself
continues to accept inherited text when a caller intentionally supplies it,
which preserves source-stack matching in the permanent matcher.

## Evidence

- `definitionKeyword.test.ts` proves a main-text `＜Blocker＞` card matches and
  BT1-079, whose only occurrence is in inherited text, does not.
- `EX13-047.test.ts` proves Gotsumon's reveal effect bottoms BT1-079 instead of
  adding it to hand.
- Red reproduction: both tests failed before the matcher correction; the
  Gotsumon scenario added the inherited-text card to hand.
- Focused acceptance: 2 files, 16 tests passed with one worker and file
  parallelism disabled.

## Scope

This closes the definition-level main-versus-inherited keyword boundary. It is
not a whole-catalog certification of keyword compilation or live granted-keyword
behavior.
