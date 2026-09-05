import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-028.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-028", () => {
  it("pays the evolution memory cost in addition to placing three sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-028", as: "source" }],
          trash: ["EX9-008", "EX9-035", "EX9-051"],
          hand: ["EX9-064"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-064");
    expect(s.state.memory).toBe(2);
    expect(
      s
        .perm("source")
        .stack.slice(0, 3)
        .map(({ cardId }) => cardId)
        .sort(),
    ).toEqual(["EX9-008", "EX9-035", "EX9-051"]);
    expect(
      s
        .perm("source")
        .stack.slice(0, 3)
        .every(({ faceUp }) => faceUp === false),
    ).toBe(true);
    expect(s.perm("source").stack[3]!.cardId).toBe("EX9-028");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("once per turn can digivolve at end of turn by placing three Ver.4 Digimon from trash face down underneath", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          cost: {
            kind: "place",
            target: { count: 3 },
            faceDown: true,
            destination: "digivolutionStack",
            position: "bottom",
          },
        },
      ],
    });
  });
  it("inherits -3000 DP for opposing Security Digimon during your turn", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }],
    });
  });
  it("applies the inherited Security-Digimon reduction through the live ledger", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "host", under: ["EX9-028"] }] },
      1: { security: ["BT1-009", "BT1-090"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("places three Ver.4 Digimon from trash face-down before the free hand digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-028", as: "source" }],
          trash: ["EX9-008", "EX9-035", "EX9-051"],
          hand: ["EX9-063"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    const stack = s.perm("source").stack;
    expect(
      stack
        .slice(0, 3)
        .map((card) => card.cardId)
        .sort(),
    ).toEqual(["EX9-008", "EX9-035", "EX9-051"]);
    expect(stack.slice(0, 3).every((card) => card.faceUp === false)).toBe(true);
    expect(s.perm("source").topCard.cardId).toBe("EX9-063");
  });

  it("does not partially pay when fewer than three Ver.4 cards are in trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-028", as: "source" }], trash: ["EX9-008", "EX9-035"], hand: ["EX9-063"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("source").topCard.cardId).toBe("EX9-028");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-008", "EX9-035"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-063")).toBe(true);
  });
});
