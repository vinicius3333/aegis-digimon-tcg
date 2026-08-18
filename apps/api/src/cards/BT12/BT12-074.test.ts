import { digiXrosRequirementFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-074.js";

describe("BT12-074 Gumdramon", () => {
  it("uses one Save material for DigiXros -2", () => {
    expect(digiXrosRequirementFor("BT12-074")).toEqual([{ materials: [{ texts: ["Save"] }], count: 2 }]);
  });

  it("places a Save Digimon under a Tamer to draw on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "tamer" }],
          hand: [
            { card: "BT12-074", as: "gum" },
            { card: "BT10-008", as: "save" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gum").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-009"));
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toContain("BT10-008");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });
});
