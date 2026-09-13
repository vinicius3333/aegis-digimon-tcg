# Blast DNA Digivolve lifecycle audit

## Scope and rule source

This bounded audit covers the public Counter procedure in comprehensive-0250 §16-31-1. The executable citation uses SHA-256 `ec9da1f563847efe4dfee871cf63d9a84b02fe13512f2826d59ac86e48f2a421` for the reviewed rules-index chunk.

The current catalog contains seven distinct printed recipes: BT20-060 Alphamon + Ouryumon, EX6-029 Angewomon + LadyDevimon, BT20-045 Breakdramon + Slayerdramon, BT20-076 DinoBeemon + Paildramon, EX6-011 Durandamon + BryweLudramon, BT20-081 Fenriloogamon + Kazuchimon, and BT17-078 WarGreymon + MetalGarurumon. These are recipe parameters consumed by the same Blast DNA Counter mechanism; this document does not certify every recipe from one provider.

## Public evidence

`apps/api/src/engine/conformance/keyword-blast-dna-consent.test.ts` contains two public BT20-045 Examon cases. The accepted case exposes four real Counter choices (two Breakdramon field instances × two Slayerdramon hand instances), responds with the exact field and hand instance IDs, and verifies the resulting Examon stack `[hand Slayerdramon, field Breakdramon's source, field Breakdramon]`. The unused field/hand pair remains in its original zones. The refusal case responds to the Counter window without a recipe and verifies the field stack and hand IDs remain unchanged.

Both cases use memory 3 before the attack and verify memory remains 3, so the zero-cost Counter route does not pay ordinary memory. They settle the public attack to `isAttacking === false` with no pending decision and account for the security state: the refusal attack consumes the defending security card; the accepted Counter route completes the attack-resolution pipeline while preserving the defending security card under the current Counter semantics. No draw effect is printed by BT20-045, so draw/recovery behavior is outside this provider's claim.

The exact physical source order and refusal behavior are therefore proved for one native printed recipe with multiple eligible field/hand pairs. Existing provider tests cover additional recipe-specific paths, including BT20-060 recovery, but recipe breadth, inherited/granted producers, and source departure/expiry classes remain open.

## Bounded status

- **Proved:** public Counter timing; explicit accept/refuse; exact physical field and hand selection; two-pair candidate enumeration; zero memory payment; complete pending/attack settlement for BT20-045.
- **Open:** independent public lifecycle evidence for the other six printed recipes; any inherited or runtime-granted Blast DNA producer if one is added; recipe-specific restrictions and any provider-specific draw/recovery sequencing.
- **Not claimed:** whole-catalog certification, equivalence of all seven recipes, or draw behavior for BT20-045.

Focused command: `pnpm --filter @aegis/api exec vitest run src/engine/conformance/keyword-blast-dna-consent.test.ts` — 2 tests passed.
