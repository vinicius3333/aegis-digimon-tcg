# Digisorption lifecycle audit

Rules source: Comprehensive Rules §16-10-1, `comprehensive-0228`, SHA-256
`4222de312acf7f62161e0c6a2c2655f30fcef0259ca405ed88fb7e7e8ca10375`.

Current executable proof is bounded to
`apps/api/src/engine/conformance/keyword-digisorption-consent.test.ts`:

- BT3-056 Ceresmon, printed Digisorption -3: public acceptance suspends the
  selected physical payer and charges the reduced evolution cost.
- BT3-056: public refusal leaves the payer unsuspended and charges the full
  printed cost.
- BT5-058 Argomon, printed Digisorption -2: a distinct provider pays through
  the same public evolution path.

The payer-selection case proves exact instance identity among two eligible
friendly Digimon. The evolving hand instance is also exposed as the public
identity alias for the still-live base permanent during payment; the opponent
instance is excluded. It does not certify every provider. Signed -2 and -3 are the
currently exercised printed reductions; other reductions, granted or inherited
Digisorption, redirect effects, and once-per-turn/source-change interactions
remain open. No claim is made for a complete catalog or all consumer shapes.

The consent suite now captures the optional decision before any payer movement:
refusal leaves the candidate unsuspended and charges the full printed cost.
The accepted BT3-056 case selects a specific physical payer among two friendly
candidates; the other candidate and the opponent are excluded, the payer is
suspended, the evolution stack keeps the exact BT3-056 instance, and memory
moves from 10 to 8 (printed cost 5 minus 3). The BT5-058 case independently
covers the printed -2 provider and reduced payment from 4 to 2.

| Obligation                                                    | Current evidence                                                                                                                                       | Status                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Optional consent precedes payment                             | New consent case captures the optional request before any suspension                                                                                   | Proven for BT3-056 -3 and BT5-058 -2         |
| Payment is one eligible unsuspended Digimon                   | BT3-056 manually selects `payerB`; candidate payload includes both own payers and the evolving-card alias for the live base, but excludes the opponent | Proven for this public source shape          |
| Refusal is all-or-nothing                                     | BT3-056 refusal leaves the payer ready and charges 5 memory                                                                                            | Proven for -3                                |
| Signed amount and stack result                                | BT3-056 -3 and BT5-058 -2 assert reduced memory, exact evolving instance, and base under the resulting stack                                           | Proven for these two printed amounts         |
| Redirect, inherited/granted, and once-per-turn source changes | Not exercised by this owner file; BT3-056 redirect remains a separate provider interaction                                                             | Open, bounded to actual providers when added |

Focused evidence command (run after the final assertion correction):

```sh
pnpm --filter @aegis/api exec vitest run \
  src/engine/conformance/keyword-digisorption-consent.test.ts \
  src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts \
  src/cards/BT5/BT5-058.test.ts \
  --pool=forks --maxWorkers=1 --no-file-parallelism
```

This run produced 3 files / 38 tests passed in 2.51s. Oxfmt, Oxlint, and
`git diff --check` passed for the changed Digisorption files. Earlier baseline
chapter evidence remains historical and does not certify this owner file.
