import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_099 } from "./BT24-099.js";
import "../index.js";

describe("BT24-099 Super Hacking", () => {
  it("implements the Appmon cost, deletion arming, and Delay link", () => {
    expect(BT24_099.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
        },
      },
    });
    const main = BT24_099.effects?.find((entry) => entry.trigger === "Main" && entry.keywords === undefined);
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: {
        kind: "trash",
        target: {
          filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          count: 1,
        },
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(main?.actions?.[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    const arm = BT24_099.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(arm?.actions?.[0] as { event?: string; sourceFilter?: unknown; actions?: unknown[] }).toMatchObject({
      event: "onDeletionOf",
      sourceFilter: { controller: "any", kind: ["Digimon"] },
    });
    const armAction = arm?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(armAction?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Delay" },
    });
    const delay = BT24_099.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay?.actions?.[0]).toMatchObject({
      kind: "Link",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
        count: 1,
      },
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    });
    expect(BT24_099.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("pays the Appmon hand-trash cost atomically before draw and battle-area placement (Q5711)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "appmon" }],
          hand: [
            { card: "BT24-099", as: "option" },
            { card: "BT21-009", as: "costCard" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-099"));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costCard").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-099", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-099")).toBe(true);
  });
});
