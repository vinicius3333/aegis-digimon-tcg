import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-048.js";
import "./BT10-052.js";
describe("BT10-048 Sunflowmon", () => {
  it("suspends a green Digimon to play a 3000 DP Vegetation Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-067", as: "cost" }, { card: "BT1-064", as: "base" }], hand: [{ card: "BT10-048", as: "evolving" }, { card: "BT10-043", as: "played" }] } }, { autoAcceptOptional: true, autoSelectCards: true }); s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(p => p.topCard?.instanceId === s.inst("played").instanceId));
    expect(s.perm("cost").isSuspended).toBe(true);
  });

  it("draws for an allied effect suspension but not an opposing one", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-048"] },
          { card: "BT10-046", as: "ally" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT10-020", as: "opponent" }] },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not draw when Digisorption suspends a Digimon before digivolution completes (Q1974)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-048", as: "base" }, { card: "BT10-046", as: "cost" }],
        hand: [{ card: "BT10-052", as: "evolving" }],
        deck: [{ card: "BT1-001", as: "shouldNotDraw" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-052");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shouldNotDraw").instanceId)).toBe(false);
  });
});
