import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-052.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-052", () => {
  it("once per turn digivolves at end of turn by placing three Ver.5 Digimon from trash underneath", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Digivolve", from: ["hand", "trash"], into: { nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }] }, cost: { kind: "place", target: { count: 3 }, faceDown: true, destination: "digivolutionStack" } }] }));
  it("requires exactly three Ver.5 cards for optional face-down bottom placement", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
    optional: true,
    abortOnDecline: true,
    cost: {
      kind: "place",
      target: { count: 3, from: ["trash"], filter: { zone: "trash", nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }] } },
      destination: "digivolutionStack",
      position: "bottom",
      host: "self",
      faceDown: true,
    },
  }));
  it("inherits de-digivolve one on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "DeDigivolve", amount: 1 }] }));
  it("places three Ver.5 cards face-down from trash and digivolves into a Ver.5 at end of turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-052", as: "source" }],
        trash: ["EX9-010", "EX9-015", "EX9-058"],
        hand: ["EX9-043"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));

    const stack = s.perm("source").stack;
    expect(stack.slice(0, 3).map((card) => card.cardId).sort()).toEqual(["EX9-010", "EX9-015", "EX9-058"]);
    expect(stack.slice(0, 3).every((card) => card.faceUp === false)).toBe(true);
    expect(stack[3]?.cardId).toBe("EX9-052");
    expect(s.perm("source").topCard.cardId).toBe("EX9-043");
  });
});
