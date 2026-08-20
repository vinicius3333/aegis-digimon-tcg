import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-084.js";

describe("BT23-084 Erika Mishima", () => {
  it("atomically pays both costs and plays a level 3 CS Digimon into the empty breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-084", as: "erika" },
            { card: "BT23-101", as: "hudie" },
          ],
          hand: [{ card: "BT23-026", as: "lopmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnEndTurn,
    );

    expect(s.perm("erika").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-101")).toBe(true);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT23-026");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-026")).toBe(false);
  });

  it("gains memory when a CS Digimon is present", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(effect.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "youHave" } });
  });

  it("pays by suspending this Tamer and returning a Hudie Digimon, then plays a level 3 CS Digimon into an empty breeding area", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any).actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      breeding: true,
      requiresEmpty: "breedingArea",
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "compound",
        costs: [
          { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
          { kind: "return", target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] } } },
        ],
      },
    });
    expect(action.target.filter.levels).toEqual([3]);
    expect(action.target.filter.nameOrTrait).toEqual([{ tokens: ["CS"], match: "trait" }]);
  });

  it("grants Alliance only to this card when it is an inherited Hudiemon/Eater card", () => {
    const aura = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(aura).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Alliance" } },
      // Structured gate — a "raw" kind evaluates as unmet, so the Aura would never grant.
      while: { kind: "anyOf" },
    });
  });
});
