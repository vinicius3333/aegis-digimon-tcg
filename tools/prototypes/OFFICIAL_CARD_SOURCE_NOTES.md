# Official card source prototype

Question: can Bandai's official card-list pages replace Taka as the authority
for printed card text?

Run one comparison without changing the catalog:

```bash
pnpm poc:official-card -- BT24-021
```

The prototype fetches the Japanese and English pages by card ID, exposes their
parsed text, and compares the English effect fields with `cards.json`. The
Japanese response is retained as the canonical provenance because Bandai says
the Japanese card list takes priority.

## Verdict

The approach is viable as a read-only drift detector. Trials covered a regular
Digimon (`BT24-021`), Tamer (`BT24-082`), Option (`BT24-089`), Link card
(`BT24-032`), ACE (`BT17-015`), and dual card (`BT25-043`). The parser found
the expected SnowGoblimon match after whitespace normalization and surfaced
real wording differences in the other representative records.

It should not overwrite `cards.json` directly. The official HTML has stable,
semantic labels but no public JSON contract, and the local catalog contains
intentional normalization and historical English wording. A production version
should snapshot the official responses, report field-level diffs in CI, and
require human review before catalog changes. Taka can remain a bulk metadata
source, but official-page drift should take precedence for printed text.

## Full newest-set trial

Run against the complete newest Booster and Extra Booster collections in the
catalog on 2026-09-20:

| Set  | Cards | Exact normalized match | Text mismatch | Fetch/parser failure |
| ---- | ----: | ---------------------: | ------------: | -------------------: |
| BT26 |   104 |                     35 |            69 |        0 after retry |
| EX13 |    77 |                     33 |            44 |                    0 |

BT26 mismatches affected `effectText` on 53 cards and
`inheritedEffectText` on 39 cards. EX13 mismatches affected `effectText` on
38 cards and `inheritedEffectText` on 7 cards; a card can differ in both.

The mismatches mix several classes that a production validator should report
separately:

- editorial-only differences, such as a missing final period after a keyword;
- official reminder text omitted from the local catalog;
- structural differences, such as an Assembly header present locally but not
  in the official English HTML;
- likely stale or incorrect local text, such as EX13-002 carrying a local rule
  that appears on neither official language page.

The high raw mismatch rate means exact normalized equality is useful for
finding candidates but too noisy as a blocking CI gate. The next version should
emit a review report with raw official text and classify punctuation, reminder
text, structural clauses, and substantive wording separately.
