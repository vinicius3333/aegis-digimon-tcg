import { describe, expect, it } from "vitest";
import { compiled as BT25_024 } from "./BT25-024.js";
import "../index.js";

describe("BT25-024 Lekismon", () => {
  it("draws one on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_024.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([]);
      expect(effect?.keywords).toEqual([{ keyword: "Draw", amount: 1, raw: "＜Draw 1＞" }]);
    }
  });

  it("offers Crescemon from hand only for red own Digimon events", () => {
    const effect = BT25_024.effects?.find((entry) => entry.trigger === "YourTurn");
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"] as const) {
      const watcher = effect?.actions?.find((action) => action.kind === "SubTrigger" && action.event === event);
      expect(watcher).toMatchObject({
        sourceFilter: { controller: "mine", kind: ["Digimon"] },
        fireCondition: { kind: "triggerSubjectHasColor", value: "Red" },
      });
      const subTrigger = watcher as { actions?: unknown[] } | undefined;
      expect(subTrigger?.actions?.[0]).toMatchObject({
        kind: "Digivolve",
        into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Crescemon"], match: "name" }] },
        from: ["hand"],
        reduceCost: 1,
        optional: true,
      });
    }
  });

  it("preserves inherited Jamming", () => {
    expect(BT25_024.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }),
      ]),
    );
  });
});
