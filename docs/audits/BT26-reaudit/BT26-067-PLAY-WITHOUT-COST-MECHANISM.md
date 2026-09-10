# BT26-067 PlayWithoutCost mechanism

## Red reproduction

The retained BT26-067 End-of-Your-Turn tests originally used BT26-060 (printed play cost 16) and expected its cost-4 reduction to charge 12 memory. A real `startTurnLoop()` pass applies the production turn-end gauge of `-3` before the `OnEndTurn` effect resolves. The optional PlayWithoutCost preflight therefore correctly finds the target but rejects it as unaffordable; no optional decision is opened and the return cost is not paid. This reproduced the prior two retained reds.

## Green boundary

The corrected public regression uses BT25-008, a real red `[Iliad]` Digimon with play cost 3. The same `reduceCostBy: 4` action floors its payable cost at zero. Through the public End-of-Your-Turn loop, the test now observes the optional decision, Wizardmon at deck bottom, BT25-008 in play, and the decline path leaving both cards unmoved. The separate BT26-060 case remains the explicit unaffordable negative.

The loose-card resolver preserves the primary red target and its blue `orFilters` alternative through preflight and resolution. Optional PlayWithoutCost preflight remains transactional: it does not offer the action when the selected target cannot be paid after reduction, so the self-return cost cannot strand the source.

## Evidence

Command:

`pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-067.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 11/11 tests passed.

No debug logging remains. No injected timing helper, direct `turnSeat` mutation, numeric security, or Digi-Egg fixture is used.
