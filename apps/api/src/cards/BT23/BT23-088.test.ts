import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-088.js";

describe("BT23-088 K", () => {
  it("trashes an eligible hand card to gain memory at the start of the main phase", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("deletes this Tamer before the end-of-turn trash digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any;
    const action = effect.actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: false,
      optional: true,
      cost: { kind: "deleteOwn", target: { isSelf: true, filter: { isSelfRef: true } } },
    });
    expect(action.into.levelComparison).toMatchObject({ op: "lte", value: 5 });
    expect(action.into.nameOrTrait).toEqual([{ tokens: ["Undead", "Dark Animal"], match: "trait" }]);
  });
});
