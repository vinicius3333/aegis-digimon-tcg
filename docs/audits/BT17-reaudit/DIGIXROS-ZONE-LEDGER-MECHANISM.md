# "Cards from your trash may also be placed for this card's DigiXros" (BT17-057, Q2811)

## Symptom

BT17-057 Chaosdramon prints "While you have a black Tamer, cards from your trash may also be
placed for this card's DigiXros." With a black Tamer on the board and [Machinedramon] in the
trash, the DigiXros declaration was refused: `{ ok: false, reason: "invalid-material" }`.

## Root cause — two halves

**The gate.** `validateDigiXros` in `apps/api/src/engine/actions/digiXros.ts` derived its
`trashMax` from three sources only: `allowsDigiXrosMaterialsFromTrash` (the played card's own
`AllowDigiXrosMaterialsFromTrash` IR), the hand-authored `DIGIXROS_TRASH_NAME_ALLOWANCES`
table, and the expander-Tamer registry. It never read the per-seat `expandDigiXrosZones`
ledger, which the effect-driven play path (`interpreter/actions/play.ts`) does consume. The
direct `playCard`/DigiXros verb was therefore strictly stricter than the effect path.

**The grant.** Closing that alone was not enough: the ledger was empty. BT17-057's
`GrantStatic { grant: "digixrosFromTrash" }` targets `isSelfRef`/`isSelf`, and
`builderForTrigger` routes a `Static` through `staticModifier`, whose base guard is
`onField`. The clause is about "THIS CARD's DigiXros", declared while the card is still in
HAND, so the on-field guard made the permission permanently inert — it could never apply at
the only moment it matters.

## Fix

1. `interpreter/effect.ts`: `isDigiXrosZoneStatic` recognises a `Static`/`Rule` effect whose
   actions are all a `digixrosFromTrash` `GrantStatic`, and routes it to a new
   `digiXrosZoneStatic` builder in `effects/builders.ts` with no on-field base guard —
   mirroring `isColorWaiverStatic`, whose permission is likewise read while the card is off
   the battle area. The effect's own printed condition ("while you have a black Tamer")
   remains the gate.
2. `interpreter/actions/grantStatic.ts`: when the grant resolves no permanent target and the
   source has no permanent, record it through `expandDigiXrosZonesForPlay` scoped to
   `ctx.source.instanceId` rather than `expandDigiXrosZones` for the whole seat. A hand copy
   therefore widens only its OWN DigiXros; BT18-065 Vemmon, which prints the same shape, is
   unaffected on the field and cannot leak the permission to another card from hand.
3. `actions/digiXros.ts`: `validateDigiXros` takes two new optional deps,
   `digiXrosExpandedZones` and `digiXrosExpandedZoneCounts`, wired in
   `GameEngine.digiXrosDeps()` to the same primitives `play.ts` reads. A ledger entry naming
   `trash` raises `trashMax` by its recorded count, or by 1 when the grant carries none —
   the same quota rule `play.ts` applies, so the two paths agree.

## Evidence

```
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-057.test.ts --maxWorkers=1 --no-file-parallelism
Tests  14 passed | 1 expected fail (15)   # red
Tests  15 passed (15)                     # green
```

The file's own negative — "refuses a trash DigiXros material without a black Tamer (Q2811
negative)" — stays green, so the Static's condition is doing the gating rather than the
permission being unconditional.

## Blast radius

```
pnpm --filter @aegis/api exec vitest run src/cards/BT18/BT18-065.test.ts src/engine/digiXros --maxWorkers=1 --no-file-parallelism
Test Files  5 passed (5)
     Tests  19 passed (19)
```

`digixrosFromTrash` appears on exactly two modules in the catalog (BT17-057, BT18-065).
