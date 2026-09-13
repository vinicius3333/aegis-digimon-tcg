# Collision and Iceclad lifecycle audit

## Contract source

The executable behavioral owner cites the reviewed full rules chunks
`comprehensive-0249` (Collision, SHA-256
`effe40c75f6c8f5deb3da41986917e76b21b7decf174245cf2463d5b956ea9f7`) and
`comprehensive-0254` (Iceclad, SHA-256
`01186c00073c1b8e41772a9f13647b23310df9f738f731d17b48b3d2b123e23c`) through
the repository KB loader. The owner is
`apps/api/src/engine/combat/keywordBattle.test.ts`; its fixtures register the
real card index and drive public attack/block intents.

## Evidence and provider classes

| Keyword   | Core public evidence                                                                                                                                                                             | Distinct current provider forms                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Collision | BT16-032 public forced-block window, decline rejection, no-keyword control, and no-DP-bonus regression; BT19-061.test.ts:499 drives the inherited Xros Heart form publicly                       | BT19-057 and BT26-085/BT26-051 provider suites cover additional printed/triggered forms |
| Iceclad   | BT22-077 public DP/count disagreement, no-keyword DP control, equal-count tie, and block-window control; EX7-021 cross-set Security battle proves the Security exception with exact physical IDs | EX8-028, EX13-076, LM-040, and BT25-103 are catalog providers with card-level coverage  |

The Collision proof confirms all opponent Digimon gain Blocker only while the
Collision attacker is attacking, and that an available blocker cannot decline.
The Iceclad proof confirms count comparison replaces DP in ordinary battles,
equal counts delete both, and Security battles remain outside that comparison.
Provider breadth remains an audit follow-up; no unsupported cross-product is
claimed.

The public behavioral owner currently covers the core clauses. Remaining work
is provider-specific source/condition review where card suites have not yet
demonstrated a distinct consumer path.
