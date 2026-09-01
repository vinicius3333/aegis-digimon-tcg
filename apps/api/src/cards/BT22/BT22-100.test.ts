import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT22-100.js";

describe("BT22-100 Cyberspace EDEN", () => {
  it("waives its color requirement only while there are no face-up security cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(effect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHaveNone",
        filter: { zone: "security", faceUp: true },
      },
    });
  });

  it("adds the bottom security card to hand, then places itself face up at the bottom", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", toTop: false, faceUp: true },
    ]);
  });

  it("grants the CS DP boost from Security and allows a free CS play", () => {
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
  });

  it("moves bottom security to hand and places the physical Option face up at security bottom", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT22-100", as: "eden" }],
        battleArea: ["BT22-091"],
        security: [
          { card: "BT1-001", as: "top" },
          { card: "BT1-002", as: "bottom" },
        ],
      },
    });
    const edenId = s.inst("eden").instanceId;
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: edenId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === edenId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomId)).toBe(true);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: edenId, faceUp: true });
  });

  it("plays a qualifying CS card from hand when revealed as Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT22-100", as: "eden" }],
          hand: [{ card: "BT22-091", as: "arata" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("eden"));
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091"),
      400,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091")).toBe(true);
  });
});
