import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-097.js";

describe("BT23-097 Seventh Penetration", () => {
  it("returns itself to the bottom of the deck before activating Main", () => {
    const trigger = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    const action = trigger.actions[0].actions[0];
    expect(action).toMatchObject({ kind: "ActivateMain", optional: true, cost: { kind: "return", to: "deckBottom" } });
    expect(trigger.actions[0].sourceFilter.nameOrTrait).toEqual([
      { tokens: ["Belphemon (X Antibody)"], match: "name" },
    ]);
  });

  it("scales the opponent level floor from the number of cards in hand", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main") as any;
    expect(main.actions[0].target.filter.levelComparison).toMatchObject({ op: "gte", value: 0 });
    expect(main.actions[0].target.filter.levelComparison.scaling.filter).toMatchObject({
      controllerDefault: "mine",
      zone: "hand",
    });
  });
});
