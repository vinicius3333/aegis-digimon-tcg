# Jupitermon DUAL and Sirenmon bug fix

## Reported behavior

The Discord report says BT26-033 Jupitermon / Wide Plasment can be used for free with only 2 opposing memory through Dan Yuki & Kanan Yuki, and that the Digimon side fails to digivolve specifically over Sirenmon.

## Expected behavior

- BT24-085 may use a TS Option only when its current use cost is no greater than the opponent's memory. BT26-033's use cost is its base cost 2 plus 1 for each of its controller's security cards.
- BT26-033 may digivolve for 4 from a level 5 Digimon with the TS trait. BT25-039 Sirenmon is a level 5 TS Digimon and is therefore legal.
- The same physical DUAL card must be evaluated in the requested mode: as an Option for use-cost filters, and as a Digimon for digivolution requirements.

## Approach

Add behavioral regressions at the direct card seams for both interactions. If they fail in shared candidate filtering or cost projection, fix the smallest shared primitive so other cards receive the same rules-correct behavior. Do not add card-ID exceptions or handwritten registrations. Keep all card behavior registered exclusively through `registerIrCard`.

## Verification

Run the focused BT24-085, BT25-039, and BT26-033 tests with one worker, any changed engine mechanism tests, typecheck, lint/format checks for changed files, and `git diff --check`.
