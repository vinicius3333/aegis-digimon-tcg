import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-03.js";

describe("ST19-03 Shoemon", () => {
  it("reveals three, adds one Puppet and one LIBERATOR, and bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST19-03", as: "shoemon" }],
        deck: [{ card: "ST19-02", as: "puppet" }, { card: "ST19-14", as: "liberator" }, { card: "BT1-010", as: "rest" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("puppet").instanceId,
      s.inst("liberator").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("inherits the security-DP reduction for all opponent security Digimon", () => {
    expect(getCardDefinition("ST19-03")).toMatchObject({
      inheritedEffectText: "[Your Turn] All of your opponent's security Digimon get -3000 DP.",
    });
  });

  it("applies the inherited -3000 security-Digimon modifier from a real stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST19-10", as: "host", under: ["ST19-03"] }] },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
  });
});
