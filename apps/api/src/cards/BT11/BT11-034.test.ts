import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-034.js";

describe("BT11-034 Cutemon", () => {
  it("places 1 Xros Heart Digimon from trash under a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-095", as: "tamer" }],
        hand: [{ card: "BT11-034", as: "cutemon" }],
        trash: [
          { card: "BT10-008", as: "xrosHeart" },
          { card: "BT10-019", as: "notXrosHeart" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cutemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("xrosHeart").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("notXrosHeart").instanceId);
  });

  it("places up to 2 when Dorulumon is in one of its Digimon's digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-095", as: "tamer" },
          { card: "BT10-009", under: ["BT10-034"] },
        ],
        hand: [{ card: "BT11-034", as: "cutemon" }],
        trash: [
          { card: "BT10-008", as: "first" },
          { card: "BT10-012", as: "second" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cutemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]));
  });
});
