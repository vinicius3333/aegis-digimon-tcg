import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-105.js";

describe("BT13-105 Full Moon Meteor Impact", () => {
  it("returns one opposing Digimon, then gains one memory per four cards in the opponent's hand", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(actions[1]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      scaling: { per: 4, unit: "cards", filter: { zone: "hand", controller: "opponent" } },
    });
  });

  it("returns one opposing Digimon from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("returns an opposing Digimon and gains one memory for every four opposing hand cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "blueDigimon" }], hand: [{ card: "BT13-105", as: "option" }] },
        1: {
          battleArea: [{ card: "BT13-111", as: "target" }],
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.filter((card) => card.cardId === "BT13-111").length === 1);

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT13-111")).toBe(false);
    // The returned Digimon is the ninth opposing hand card before scaling is counted.
    expect(s.state.memory).toBe(4);
  });

  it("returns an opposing Digimon without the Main memory gain from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "blueDigimon" }],
          security: [{ card: "BT13-105", as: "securityOption", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT13-111"));

    expect(s.state.memory).toBe(0);
  });
});
