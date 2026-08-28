import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-101.js";
import "./BT9-101.js";
describe("BT9-101 Ground Fang", () => {
  it("matches catalog values and independent suspended return and security IR", () => {
    expect(getCardDefinition("BT9-101")).toMatchObject({
      colors: ["Green"], kinds: ["Option"], playCost: 8,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Main", actions: [{ kind: "Return", to: "deckBottom", target: { filter: { suspended: true, kind: ["Digimon"] } } }, { kind: "Return", to: "deckBottom", target: { filter: { suspended: true, kind: ["Tamer"] } } }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("returns a suspended opposing Digimon to deck bottom", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT9-018"], hand: [{ card: "BT9-101", as: "option" }] },
        1: { battleArea: [{ card: "BT9-045", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
