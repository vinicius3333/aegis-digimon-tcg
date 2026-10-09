# Prevented leave and Partition ordering

## Contract

When a Digimon with ＜Partition＞ would leave the battle area, Partition is triggered from that would-leave event. If a simultaneous effect then prevents the holder from leaving, Partition may still resolve and play its complete specified material set from under the surviving holder.

This is required by EX13-024 Q7274: Slayerdramon may prevent BT23-047 Examon from leaving, after which Examon's ＜Partition (green Lv.5 & blue Lv.5)＞ may play both materials.

## Engine trace

`effects/verbs/deletion.ts` captures Partition candidates from the full endangered permanent set before consulting leave-prevention replacements. At resolution, the complete matched material set must be either:

- loose after the holder actually left; or
- still together under the holder after its leave was prevented.

The all-or-nothing requirement remains enforced. Battle deletion and deletion by the holder controller's own effect remain excluded.

## Behavioral evidence

- `engine/combat/executePartition.test.ts`: Q7274 engine regression proves Examon survives, Slayerdramon pays by suspending, and both Lv.5 materials are played.
- `cards/EX13/EX13-024.test.ts`: focused card regression proves the same cross-card ruling through observable state.
- Existing Partition negative controls continue to cover battle deletion, own-effect deletion, non-Partition holders, and Overflow independence.

