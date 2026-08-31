import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-050.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-050", () => {
  it("once per turn digivolves at end of turn by placing three Ver.1 Digimon from trash underneath", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          into: { nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }] },
          cost: { kind: "place", target: { count: 3 }, faceDown: true, destination: "digivolutionStack" },
        },
      ],
    }));
  it("requires all three Ver.1 cards and places them face down at the bottom of this stack", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        target: {
          count: 3,
          from: ["trash"],
          filter: {
            zone: "trash",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }],
          },
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
        faceDown: true,
      },
    }));
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));
  it("places three Ver.1 cards face-down from trash and digivolves into a Ver.1 at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "source" }],
          trash: ["EX9-001", "EX9-007", "EX9-016"],
          hand: ["EX9-053"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));

    const stack = s.perm("source").stack;
    expect(
      stack
        .slice(0, 3)
        .map((card) => card.cardId)
        .sort(),
    ).toEqual(["EX9-001", "EX9-007", "EX9-016"]);
    expect(stack.slice(0, 3).every((card) => card.faceUp === false)).toBe(true);
    expect(stack[3]?.cardId).toBe("EX9-050");
    expect(s.perm("source").topCard.cardId).toBe("EX9-053");
  });
});
