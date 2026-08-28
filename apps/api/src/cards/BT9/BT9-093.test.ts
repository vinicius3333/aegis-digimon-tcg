import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-093.js";
import "./BT9-093.js";
describe("BT9-093 Flare Rock Soul", () => {
  it("matches catalog values and the sequential legal-digivolve and security IR", () => {
    expect(getCardDefinition("BT9-093")).toMatchObject({
      colors: ["Red"], kinds: ["Option"], playCost: 3,
      securityEffectText: "[Security] Delete 1 of your opponent's Digimon with 5000 DP or less.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Main", actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 5000 } } } }, { kind: "Digivolve", from: ["hand"], payCost: true, ignoreRequirements: false, optional: true, into: { filter: { nameOrTrait: [{ tokens: ["Shoutmon"], match: "name" }] } } }] },
        {
          trigger: "Security", isSecurity: true,
          actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 5000 } } } }],
        },
      ],
    });
  });

  it("deletes an opposing Digimon at 5000 DP or less", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT9-007"], hand: [{ card: "BT9-093", as: "option" }] }, 1: { battleArea: ["BT9-032"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
