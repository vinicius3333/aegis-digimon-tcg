import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT3/BT3-091.js";
import "./BT7-101.js";
describe("BT7-101 Thunder Laser", () => {
  it("suspends an opposing Digimon when Ten Warriors is present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-051"], hand: [{ card: "BT7-101", as: "option" }] },
        1: { battleArea: [{ card: "BT7-044", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});

describe("BT7-101 Thunder Laser — KB Q&A rulings", () => {
  it("can be used without a [Hybrid] or [Ten Warriors] Digimon, does nothing, and still counts as using an Option (Q1669)", async () => {
    const useThunderLaser = async (greenDigimon: string) => {
      const s = setupEngine(
        {
          0: { battleArea: [greenDigimon, "BT3-091"], hand: [{ card: "BT7-101", as: "option" }] },
          1: { battleArea: [{ card: "BT7-044", as: "target" }] },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.memory = 3;
      await s.ready();
      const optionId = s.inst("option").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
      await settle();
      return s;
    };

    const withoutTrait = await useThunderLaser("BT7-044");
    expect(withoutTrait.perm("target").isSuspended).toBe(false);
    expect(withoutTrait.state.memory).toBe(4);

    const withTenWarriors = await useThunderLaser("BT7-054");
    expect(withTenWarriors.perm("target").isSuspended).toBe(true);
    expect(withTenWarriors.state.memory).toBe(4);
  });
});
