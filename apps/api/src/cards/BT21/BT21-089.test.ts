import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-089.js";

describe("BT21-089 Takato Matsuki", () => {
  it("binds one qualifying Digimon so Blocker and conditional DP share the target", () => {
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"]) {
      const watcher = allTurns?.actions.find((action) => (action as { event?: string }).event === event) as
        | { actions?: unknown[] }
        | undefined;
      expect(watcher).toBeDefined();
      expect(watcher).toMatchObject({ sourceFilter: { controller: "mine", kind: ["Digimon"] } });
      const actions = watcher?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "SelectBind",
        bindAs: "takatoTarget",
        cost: { kind: "suspend" },
        optional: true,
        abortOnDecline: true,
      });
      expect(actions[1]).toMatchObject({
        kind: "GainKeyword",
        target: { fromSelectionRef: "takatoTarget" },
        keyword: { keyword: "Blocker" },
      });
      expect(actions[2]).toMatchObject({
        kind: "ModifyDP",
        target: { fromSelectionRef: "takatoTarget" },
        amount: 2000,
        condition: { kind: "combinedTrashCount", op: "gte", value: 10 },
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
