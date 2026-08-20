import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-085.js";

describe("BT13-085 Crowmon", () => {
  it("may digivolve into Ravemon from trash for the digivolution cost when attacking with a Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Digivolve", from: ["trash"], optional: true,
      into: { nameOrTrait: [{ match: "name", tokens: ["Ravemon"] }] },
      condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] } },
    });
  });

  it("inherits an outside-battle deletion rescue for a level 4 or lower purple Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost", from: ["trash"], optional: true,
      target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levelComparison: { op: "lte", value: 4 } } },
      condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
    });
  });
});
