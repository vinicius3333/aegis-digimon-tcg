import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-057.js";

describe("EX9-057", () => {
  it("moves from breeding to battle when an opponent attacks by returning four Negamon from trash or stacks to the bottom of the Digi-Egg deck", () => expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({ isBreeding: true, actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "MovePermanent", direction: "toBattle", cost: { kind: "return", target: { count: 4 } } }] }] }));
  it("gains Collision, Piercing, and Security A. +1", () => expect(compiled.effects?.filter((entry) => entry.actions.some((action) => action.kind === "GainKeyword")).flatMap((entry) => entry.actions.map((action) => (action as any).keyword?.keyword))).toEqual(expect.arrayContaining(["Collision", "Piercing", "SecurityAttack"])));
  it("places three level-six-or-lower Negamon-text Digimon from trash underneath during digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Delete", cost: { kind: "place", target: { count: 3 }, position: "top" } }));
});
