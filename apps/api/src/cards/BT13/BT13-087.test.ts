import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-087.js";

describe("BT13-087 Dynasmon", () => {
  it("reveals four and adds up to two Lucemon/Royal Knight cards, trashing the rest", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "RevealAdd", revealCount: 4, rest: "trash",
        add: [{ count: 2, to: "hand", filter: { controllerDefault: "mine", nameOrTrait: [
          { match: "name", tokens: ["Lucemon"] },
          { match: "trait", tokens: ["Royal Knight"] },
        ] } }],
      });
    }
  });

  it("deletes all opposing level 4 or lower Digimon when another matching Digimon is played", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as { sourceFilter?: unknown; actions?: unknown[] };
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controllerDefault: "mine", excludeSelf: true } });
    expect(watcher.sourceFilter).toMatchObject({ nameOrTrait: [{ match: "name", tokens: ["Lucemon"] }, { match: "trait", tokens: ["Royal Knight"] }] });
    expect(watcher.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: "all" } });
  });
});
