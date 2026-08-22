import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-095.js";

describe("BT21-095 Wind Guardians", () => {
  it("keeps the face-up-security color waiver and security/Main branches faithful", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHaveNone", filter: { zone: "security", faceUp: true } },
    });

    const securityAllTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(securityAllTurns).toMatchObject({ isSecurity: true });
    expect(securityAllTurns?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Vortex" },
      target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["WG"], match: "trait" }] } },
    });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions).toHaveLength(2);
    expect(main?.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", controller: "mine" });
    expect(main?.actions[1]).toMatchObject({ kind: "SecurityManipulation", op: "placeAsSecurity", faceUp: true });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["hand"],
      target: {
        filter: { levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
      },
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("returns the top security card and places itself face-up as security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "color" }],
          hand: [{ card: "BT21-095", as: "option" }],
          security: [{ card: "BT1-001", as: "topSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security).toEqual([expect.objectContaining({ cardId: "BT21-095", faceUp: true })]);
  });
});
