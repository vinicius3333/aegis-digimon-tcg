import { describe, expect, it } from "vitest";
import { compiled as BT25_017 } from "./BT25-017.js";
import "../index.js";

describe("BT25-017 Flaremon", () => {
  it("offers a self-attack, then hand-trash-for-delete on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_017.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "Attack", optional: true, withoutSuspending: false, target: { isSelf: true } });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } }, count: 1 },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      });
    }
  });

  it("gates the Apollomon option on blue own-Digimon events", () => {
    const effect = BT25_017.effects?.find((entry) => entry.trigger === "YourTurn");
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"] as const) {
      const watcher = effect?.actions?.find((action) => action.kind === "SubTrigger" && action.event === event);
      expect(watcher).toMatchObject({ sourceFilter: { controller: "mine", kind: ["Digimon"] }, fireCondition: { kind: "triggerSubjectHasColor", filter: { colors: ["Blue"] } } });
      const subTrigger = watcher as { actions?: unknown[] } | undefined;
      expect(subTrigger?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], reduceCost: 2, payCost: true, optional: true });
    }
  });

  it("preserves inherited Security Attack +1", () => {
    expect(BT25_017.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ isInherited: true, keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }] }),
    ]));
  });
});
