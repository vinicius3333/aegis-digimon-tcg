# ST12-11 Gankoomon target audit

The committed catalog permits exactly `[Huckmon]`, or a Digimon whose name
contains `Sistermon`, from trash. The previous direct IR applied substring
matching to both names, incorrectly allowing BaoHuckmon and SaviorHuckmon.
The filter now uses `nameExact` for Huckmon and `name` for Sistermon.
Registration remains exclusively `registerIrCard`.

Behavioral evidence:

- Real evolution plays the exact Huckmon instance and De-Digivolves two targets.
- A separate Sistermon play succeeds while BaoHuckmon stays in trash.
- An isolated BaoHuckmon-only trash case rejects the ineligible card. Restoring
  the old substring filter makes that case fail; restoring the fix passes.
- Declining the optional play leaves Huckmon in trash.
- Two completed Jesmon attacks each play a distinct Sistermon, while Gankoomon
  De-Digivolves only once. Neutral Sistermon Ciel avoids a hand-trash cost
  consuming the second play target; the opponent has sufficient security.
- Evolution fixtures include neutral draw decks and preserve legal source order.

Validation uses `--pool=forks --maxWorkers=1 --no-file-parallelism`:

- ST12-11 and ST13-16 focused verification: 2 files, 10 tests passed.
- Full ST12 after the target fix and coordinator proof corrections:
  18 files, 96 tests passed.
- Changed-file lint/format and `git diff --check` passed at integration.

This card correction is an atomic checkpoint. Full starter audit completion
still requires the remaining collection and shared-mechanism reviews.
