import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-010.js";

// A3 for BT18-010 (Bokomon) — [Your Turn][Once Per Turn]:
//   "When any of your Digimon or Tamers digivolve into a Digimon with the [Hybrid]/[Ten Warriors]
//    trait, gain 1 memory."
//
// gates on permanent.TopCard.HasHybridTenWarriorsTraits; DigivolveFromCondition is IsDigimon||IsTamer.
//
// FAILS-WHEN-REVERTED: removing the whenOneOfYoursDigivolves SubTrigger watcher from the
// staticModifier resolve prevents the memory gain when a [Hybrid]-trait Digimon digivolves.
// Without the watcher, memory stays unchanged → the "memory == 1" assertion is RED.

describe("BT18-010 [Your Turn][Once Per Turn] digivolve into [Hybrid] → gain 1 memory", () => {
  it("has complete declarative coverage for both printed clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }] },
      { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "GainMemory", amount: 1 }] }] },
    ]);
  });

  it(
    "gains 1 memory when a Hybrid-trait Digimon digivolves while BT18-010 is in play",
    async () => {
      // Place BT18-010 (Bokomon) on the controller's battle area, and a non-Hybrid Digimon
      // that will digivolve into a Hybrid one. BT12-009 (Flamemon) has the [Hybrid] trait
      // (forms: ["Hybrid"]); its stack card satisfies the DigivolveFromCondition.
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT18-010", dp: 3000, as: "bokomon" },
              // A Lv.3 Digimon (Monodramon) beneath the top satisfies DigivolveFromCondition.
              { card: "BT12-009", dp: 5000, as: "digivolvedPerm", under: ["BT1-009"] },
            ],
          },
        },
        { autoAcceptOptional: true },
      );
      const { engine, state } = s;

      // Install SubTrigger watchers via the continuous-recompute pass.
      await engine.recomputeContinuousEffects();

      state.memory = 0;
      const digivolvedPermId = s.perm("digivolvedPerm").permanentId;

      // Trigger the whenOneOfYoursDigivolves SubTrigger for the Hybrid Digimon. We simulate a
      // digivolve directly via fireSubTrigger rather than the real digivolve action path.
      await (engine as unknown as { fireSubTrigger: (event: string, payload: unknown) => Promise<void> })
        .fireSubTrigger("whenOneOfYoursDigivolves", {
          subjectPermanentId: digivolvedPermId,
        });

      await settle(() => state.memory !== 0);

      // BT18-010's watcher should have given +1 memory.
      expect(state.memory).toBe(1);
    },
  );

  it("does NOT gain memory when a non-Hybrid Digimon digivolves", async () => {
    // BT1-021 (MetalGreymon) — no [Hybrid] trait.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-010", dp: 3000, as: "bokomon" },
            { card: "BT1-021", dp: 8000, as: "nonHybridPerm", under: ["BT1-012"] },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const { engine, state } = s;
    await engine.recomputeContinuousEffects();

    state.memory = 0;
    const nonHybridPermId = s.perm("nonHybridPerm").permanentId;

    await (engine as unknown as { fireSubTrigger: (event: string, payload: unknown) => Promise<void> })
      .fireSubTrigger("whenOneOfYoursDigivolves", {
        subjectPermanentId: nonHybridPermId,
      });

    await settle(() => state.memory !== 0, 50);

    // No [Hybrid] trait → no memory gain.
    expect(state.memory).toBe(0);
  });
});
