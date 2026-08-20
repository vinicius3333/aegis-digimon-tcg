import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-010.js";

describe("EX5-010 Sandiramon", () => {
  it("draws and optionally plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] }]);
  });
  it("deletes an opposing Digimon at 5000 DP or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", value: 5000 } } } });
  });
});
