# ST12 Full Audit Evidence

This continuation closes the independent review findings for ST12-08,
ST12-10, ST12-11, ST12-12, ST12-14, and ST12-16. Evidence was traced from
`packages/shared/src/cards/data/cards.json`, the local KB, each compiled IR
module, and the shared interpreter behavior. Production behavior for every
reviewed executable card is registered exclusively through
`registerIrCard(cardId, compiled)`.

## Review findings closed

- **ST12-08 SaviorHuckmon.** The inherited Royal Knight attack trigger can
  play a Sistermon from hand or trash without cost, and a manual decline leaves
  the selected Sistermon in trash. The temporary unsuspended-attack grant and
  Royal Knight condition remain covered by the existing stack proofs.
- **ST12-10 Jesmon.** The attack-time Sistermon play is optional: declining
  leaves it in hand and does not produce the effect-play +3000 DP or Security
  Attack +1 bonus. KB Q757's accepted-path interaction remains covered.
- **ST12-11 Gankoomon.** The digivolution free play from trash is optional:
  declining leaves a matching Huckmon in trash. The accepted path and the
  nonmatching-trash rejection remain covered.
- **ST12-12 Sistermon Blanc.** KB Q758 requires that the player can refuse
  the "By trashing" cost; compiled IR now marks the Draw action optional and
  aborts it on decline. The new proof confirms the hand cost stays put and no
  cards are drawn, while the accepted path still draws exactly two.
- **ST12-14 Aus Generics.** KB Q761 permits different targets for the +2000
  DP and Piercing clauses. The proof manually selects Huckmon for DP and
  Jesmon for Piercing, demonstrating independent target decisions.
- **ST12-16 Quake! Blast! Fire! Father!** The color waiver now has distinct
  passing paths for Huckmon, Sistermon, and Royal Knight, plus the existing
  non-qualifier rejection. Its main and Security deletion behavior retains the
  inclusive play-cost-13 boundary proof.

## Focused verification

Each changed focused test ran in its own process using
`--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`:

- `ST12-08.test.ts`: 5 passed
- `ST12-10.test.ts`: 8 passed
- `ST12-11.test.ts`: 3 passed
- `ST12-12.test.ts`: 2 passed
- `ST12-14.test.ts`: 3 passed
- `ST12-16.test.ts`: 5 passed

The exact serial ST12 collection gate, typecheck, inventory, and diff check
are recorded with the delivery commit after this report is finalized. This
document replaces the former root-level `ST12-AUDIT.md`; it avoids treating
file presence or earlier broad claims as proof in place of these reproducible
behavioral cases.
