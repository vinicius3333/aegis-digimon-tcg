import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-026.js";

describe("BT12-026 ShogunGekomon", () => {
  it("places a blue level 5 or lower from hand, then trashes the bottom 2 sources of 2 opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-026", as: "shogun", under: ["BT1-009"] }],
          hand: [{ card: "BT12-028", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT12-025", as: "first", under: ["BT1-009", "BT1-010"] },
            { card: "BT12-025", as: "second", under: ["BT12-019", "BT12-020"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shogun"));
    await settle(() => s.perm("first").stack.length === 0 && s.perm("second").stack.length === 0);
    expect(s.perm("shogun").stack[0]!.instanceId).toBe(s.inst("cost").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(s.state.memory).toBe(1);
  });

  it("can decline the placement cost and excludes a blue level 6 card", async () => {
    const declined = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-026", as: "shogun" }], hand: [{ card: "BT12-028", as: "cost" }] },
        1: { battleArea: [{ card: "BT12-025", as: "target", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.WhenDigivolving, declined.perm("shogun"));
    expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(declined.inst("cost").instanceId);
    expect(declined.perm("target").stack).toHaveLength(2);

    const tooHigh = setupEngine({
      0: { battleArea: [{ card: "BT12-026", as: "shogun" }], hand: [{ card: "BT12-029", as: "cost" }] },
      1: { battleArea: [{ card: "BT12-025", as: "target", under: ["BT1-009", "BT1-010"] }] },
    });
    await advance(tooHigh.engine).fire(EffectTiming.WhenDigivolving, tooHigh.perm("shogun"));
    expect(tooHigh.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(tooHigh.inst("cost").instanceId);
    expect(tooHigh.perm("target").stack).toHaveLength(2);
  });

  it("gains memory once when an opponent Digimon's digivolution card is trashed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-026", as: "shogun" }] },
      1: {
        battleArea: [
          {
            card: "BT1-009",
            as: "target",
            under: [{ card: "BT12-019", as: "source" }],
          },
        ],
      },
    });
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("target").permanentId, [s.inst("source").instanceId], 0);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("source").instanceId);
  });

  it("gains memory only once per turn across separate opponent source-trash events", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-026", as: "shogun" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", under: [{ card: "BT12-019", as: "source1" }] },
          { card: "BT1-009", as: "second", under: [{ card: "BT12-020", as: "source2" }] },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("first").permanentId, [s.inst("source1").instanceId], 1);
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("second").permanentId,
      [s.inst("source2").instanceId],
      1,
    );
    expect(s.state.memory).toBe(1);
  });
});
