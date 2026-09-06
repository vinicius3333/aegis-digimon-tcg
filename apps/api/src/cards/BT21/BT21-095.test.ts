import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-095.js";
import "../index.js";

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
          battleArea: [{ card: "BT1-029", as: "color" }],
          hand: [{ card: "BT21-095", as: "option" }],
          security: [{ card: "BT1-001", as: "topSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionInstanceId));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT21-095" && card.faceUp)).toBe(true);
  });

  it("Q4609/Q4610 works with zero security: it only places itself face-up", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT21-095", as: "option" }] },
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
  });

  it("Security plays a level-5 WG Digimon from hand without paying cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT21-095", as: "option" }],
          hand: [{ card: "BT21-038", as: "wg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("wg").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("Security grants Vortex to own WG Digimon and declines an absent play target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-038", as: "wg" }],
          security: [{ card: "BT21-095", as: "option" }],
          hand: [{ card: "BT21-039", as: "tooLarge" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(observe(s.engine).hasKeyword(s.perm("wg"), "Vortex")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooLarge").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
