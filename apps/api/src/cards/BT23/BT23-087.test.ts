import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-087.js";

describe("BT23-087 Violet Inboots", () => {
  it("returns this Tamer to play another Violet Inboots and conditionally a Ghostmon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      cost: { kind: "return", to: "deckBottom", target: { isSelf: true, filter: { isSelfRef: true } } },
      optional: true,
      abortOnDecline: true,
    });
    expect(effect.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      optional: true,
      condition: { kind: "youHaveNone" },
    });
  });

  it("suspends this Tamer to grant Rush to the Ghost-trait Digimon that digivolved", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    const watcher = effect.actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      sourceFilter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
      optional: true,
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "untilTurnEnd",
      target: { filter: { isTriggerSource: true } },
    });
  });
});
