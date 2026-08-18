import { describe, it, expect } from "vitest";
// Self-register every compiled-IR card module so the Static reduceCost cards' real IR is looked up.
import "../cards/index.js";
import { setupEngine } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

/**
 * CR-01 A3: a `Static` `Replacement{mode:"reduceCost"}` installed during the continuous recompute
 * must NOT accumulate across recomputes. `recomputeContinuousEffects` brackets every timing window
 * (and is invoked several times per turn), so a missing `clearContinuous` on the SubTrigger
 * registry makes `costReductionFor` report N, 2N, 3N… as recomputes pile up — the exact
 * accumulation class ST3-12 fixed for the security-DP ledger.
 *
 * FAILS-WHEN-REVERTED: remove `this.subTriggers.clearContinuous()` from
 * recomputeContinuousEffects (or drop the `continuous` stamp on subscribeReplacement) =>
 * the reduceCost replacement re-subscribes each recompute and the third recompute reports
 * 3·N instead of N => the "stays at N" assertions go RED.
 *
 * Vehicles named by the reviewer: BT21-030 (Static reduceCost 1), BT22-041 (Static reduceCost 6).
 */

const REDUCE_1 = "BT21-030"; // Static -> Replacement{reduceCost, amount:1}
const REDUCE_6 = "BT22-041"; // Static -> Replacement{reduceCost, amount:6}

describe("CR-01 — Static reduceCost replacement does not accumulate across continuous recomputes", () => {
  it("BT21-030's Static reduceCost stays at 1 over 3 recomputes (not 1, 2, 3)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: REDUCE_1, dp: 0, as: "perm" }] } });
    const perm = s.perm("perm");

    const reductionAfterRecompute = async (): Promise<number> => {
      await s.engine.recomputeContinuousEffects();
      return observe(s.engine).costReduction("wouldBePlayed", perm.permanentId);
    };

    expect(await reductionAfterRecompute()).toBe(1);
    expect(await reductionAfterRecompute()).toBe(1);
    expect(await reductionAfterRecompute()).toBe(1);
  });

  it("BT22-041's Static reduceCost stays at 6 over 3 recomputes (not 6, 12, 18)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: REDUCE_6, dp: 0, as: "perm" }] } });
    const perm = s.perm("perm");

    const reductionAfterRecompute = async (): Promise<number> => {
      await s.engine.recomputeContinuousEffects();
      return observe(s.engine).costReduction("wouldBePlayed", perm.permanentId);
    };

    expect(await reductionAfterRecompute()).toBe(6);
    expect(await reductionAfterRecompute()).toBe(6);
    expect(await reductionAfterRecompute()).toBe(6);
  });
});
