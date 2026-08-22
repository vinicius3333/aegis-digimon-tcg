import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-095.js";

describe("BT20-095 Fellowship of Hope's Keepers", () => {
  it("reveals and places itself for the Main effect", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.keywords)).toMatchObject({
      actions: [{ kind: "RevealAdd", revealCount: 3 }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("only offers the breeding-area digivolution as Delay", () => {
    const delay = compiled.effects.find((entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"));
    expect(delay).toMatchObject({ actions: [{ kind: "Digivolve", target: { filter: { zone: "breedingArea", levelComparison: { op: "gte", value: 3 } } }, into: { nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }] }, cost: { kind: "moveToBattleArea" }, abortOnDecline: true }] });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions).toHaveLength(1);
  });
});
