import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-099.js";
import "./BT9-099.js";
describe("BT9-099 Sunrise Buster", () => {
  it("matches catalog values and the Tamer-scaled DP and security IR", () => {
    expect(getCardDefinition("BT9-099")).toMatchObject({
      colors: ["Yellow", "Red"], kinds: ["Option"], playCost: 5,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Main", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { kind: ["Tamer"], colors: ["Red", "Yellow"] } } }, { kind: "ModifyDP", amount: -3000, duration: "forTheTurn", optional: true, scaling: { unit: "cards", per: 1, filter: { kind: ["Tamer"], colors: ["Red", "Yellow"] } } }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("reduces an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT9-032", "BT9-007"], hand: [{ card: "BT9-099", as: "option" }] },
        1: { battleArea: [{ card: "BT9-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP < 10000);
    expect(s.perm("target").currentDP).toBeLessThan(10000);
  });
});
