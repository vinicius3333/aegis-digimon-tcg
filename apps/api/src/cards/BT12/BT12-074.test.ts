import { digiXrosRequirementFor } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
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

  it("saves itself under a Tamer when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-074", as: "gum" }, { card: "BT12-094", as: "tamer" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const sourceId = s.perm("gum").topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("gum").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId));
    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId)).toBe(true);
  });

  it("draws from the inherited Save attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-077", as: "host", under: ["BT12-074"] }], deck: ["BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-010");
  });
});
