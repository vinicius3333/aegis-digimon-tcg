# Digi-Burst parameter audit

The §16-14 contract says Digi-Burst activates the specified effect by trashing the
printed number of digivolution cards from the Digimon with the keyword, and that
processing is optional. This is the full reviewed KB chunk `comprehensive-0232`,
SHA-256 `6aef42a5c090e8124386365a9cb8b7035b25ac52979537f770eadd5d54e807f2`.
`keyword-digi-burst-parameters.test.ts` drives the public
`activateEffect` and `digivolve` intents against compiled `registerIrCard` providers.

The focused proof covers BT4-072 (1), ST4-13 (2), BT4-049 (3), and BT4-062 (4).
Each accepted case asserts the exact physical source instance IDs in the owner's
trash. The BT4-062 boundary case has only three sources after digivolution; its
effect does not declare, does not create an optional decision, and leaves the
opponent's eligible Digimon in the battle area unsuspended.

This is bounded parameter and source-identity evidence for these providers. It is
not a whole-catalog Digi-Burst certification, and it does not establish every
downstream effect shape or timing combination.
