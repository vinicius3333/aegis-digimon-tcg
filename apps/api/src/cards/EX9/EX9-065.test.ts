import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-065.js";

describe("EX9-065", () => {
  it("has Blast Digivolve and Scapegoat and plays a level-four-or-lower DM Digimon from trash on play or digivolution", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Scapegoat", raw: "＜Scapegoat＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], target: { filter: { levelComparison: { op: "lte", value: 4 } } } });
  });
  it("grants Blocker and Retaliation to all own Ver.4 Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions ?? [];
    expect(actions.find((action) => (action as any).keyword?.keyword === "Blocker")).toBeDefined();
    expect(actions.find((action) => (action as any).keyword?.keyword === "Retaliation")).toBeDefined();
  });
});
