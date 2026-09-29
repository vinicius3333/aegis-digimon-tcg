import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-100.js";

describe("BT3-100 Desperado Blaster", () => {
  it("trashes two bottom sources and suspends the now-sourceless Digimon with green present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-020", "BT3-044"], hand: [{ card: "BT3-100", as: "option" }] },
        1: {
          battleArea: [
            {
              card: "BT3-020",
              as: "target",
              under: [
                { card: "BT3-021", as: "first" },
                { card: "BT3-022", as: "second" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("target").stack.length === 0 &&
        s.perm("target").isSuspended &&
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("first").instanceId) &&
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("second").instanceId),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });

  it("can trash only one of two available bottom sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-020", "BT3-044"], hand: [{ card: "BT3-100", as: "option" }] },
        1: {
          battleArea: [
            {
              card: "BT3-020",
              as: "target",
              under: [
                { card: "BT3-021", as: "first" },
                { card: "BT3-022", as: "second" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT3-022"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT3-021");
  });

  it("activates its full Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-020", "BT3-044"], security: [{ card: "BT3-100", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT3-020", as: "target", under: ["BT3-021", "BT3-022"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});

describe("BT3-100 Death Parade Blaster — KB Q&A rulings", () => {
  async function playOptionThenGreen(greenInPlayAtActivation: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: greenInPlayAtActivation ? ["BT3-021", "BT3-044"] : ["BT3-021"],
          hand: [
            { card: "BT3-100", as: "option" },
            { card: "BT3-044", as: "lateGreen" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT3-020", as: "sourceless" },
            { card: "BT3-022", as: "stripped", under: [{ card: "BT3-021", as: "bottomSource" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle(() => s.perm("stripped").stack.length === 0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lateGreen").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 0);
    await settle();

    return {
      bottomSourceTrashed: s.state.players[1]!.trash.some(
        (card) => card.instanceId === s.inst("bottomSource").instanceId,
      ),
      suspendedCount: s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended).length,
    };
  }

  it("does not suspend a sourceless Digimon when the green Digimon is played only after the effect resolves (Q1134)", async () => {
    const lateGreen = await playOptionThenGreen(false);
    expect(lateGreen.bottomSourceTrashed).toBe(true);
    expect(lateGreen.suspendedCount).toBe(0);

    const greenAtActivation = await playOptionThenGreen(true);
    expect(greenAtActivation.bottomSourceTrashed).toBe(true);
    expect(greenAtActivation.suspendedCount).toBe(1);
  });
});
