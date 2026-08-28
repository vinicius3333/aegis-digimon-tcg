import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-097.js";
import "../index.js";

describe("BT21-097 App Link", () => {
  it("verifies the Appmon waiver, reveal-and-place Main, Delay Link, and Security placement", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: { kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
      },
    });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "trash" });
    expect(main?.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });

    const delay = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(delay?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(delay?.actions[0]).toMatchObject({
      kind: "Link",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    });

    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("reveals an Appmon/App Driver card, trashes the rest, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-041", as: "color" }],
          hand: [{ card: "BT21-097", as: "option" }],
          deck: [
            { card: "BT21-041", as: "appmon" },
            { card: "BT1-009", as: "restA" },
            { card: "BT1-010", as: "restB" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-097"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("appmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("restA").instanceId, s.inst("restB").instanceId]),
    );
  });

  it("Q4734 waives color for an Appmon in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-041", as: "appmon" },
        hand: [{ card: "BT21-097", as: "option" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("Security places itself without changing memory", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT21-097", as: "option" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("option").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
