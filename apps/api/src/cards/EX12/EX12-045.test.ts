import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-045 Sanzomon", () => {
  it("returns the top security card and recovers when two or fewer security cards remain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-045", as: "source" }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-011"]);
  });

  it("plays a Gokuumon-in-text card from hand for two less when your security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-045", as: "source" }],
          hand: [{ card: "EX12-015", as: "target" }],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-015"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-015")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(false);
  });

  it("does not react to the opponent's security removal or a second removal in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-045", as: "source" }],
          hand: ["EX12-015", "EX12-015"],
          security: ["BT1-010"],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 20;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("maps the catalog text, evolution, filtered target, reduction, and inherited attack effect", () => {
    const card = getCardDefinition("EX12-045");
    const compiled = registeredCompiledCards.get("EX12-045")!;
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    const watcher = yourTurn.actions[0];
    const play = watcher.actions[0];

    expect(card?.effectText).toContain("[Gokuumon] in its text");
    expect(card?.inheritedEffectText).toContain("-4000 DP");
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Shambala"], cost: 3, isAlternate: true }]);
    expect(yourTurn.frequency).toBe("OncePerTurn");
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: true,
          reduceCostBy: 2,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                { tokens: ["Gokuumon"], match: "text" },
                { tokens: ["SW"], match: "trait" },
              ],
            },
          },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
    expect(play).toBeDefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
