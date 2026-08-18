import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-009.js";
import "./BT9-011.js";
import "./BT9-014.js";
describe("BT9-014 WarGrowlmon (X Antibody)", () => {
  it("deletes opposing Digimon whose combined DP is at most 6000", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-003", as: "base" }], hand: [{ card: "BT9-014", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-010", as: "first", dp: 3000 }, { card: "BT1-011", as: "second", dp: 3000 }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses Guilmon X and Growlmon X sources to raise the combined deletion budget to 8000", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "AD1-003",
          as: "warGrowlmon",
          under: ["BT9-009", "BT9-011"],
        }],
        hand: [{ card: "BT9-014", as: "warGrowlmonX" }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "first", dp: 4000 },
          { card: "BT1-011", as: "second", dp: 4000 },
        ],
      },
    }, {
      autoAcceptOptional: true,
      autoOrderTriggers: true,
      autoSelectCards: true,
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("warGrowlmon").permanentId,
      instanceId: s.inst("warGrowlmonX").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-011"]),
    );
  });
});
