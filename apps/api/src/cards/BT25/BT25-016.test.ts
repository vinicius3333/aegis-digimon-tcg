import { describe, expect, it } from "vitest";
import { compiled as BT25_016 } from "./BT25-016.js";
import "../index.js";

describe("BT25-016 GrapLeomon", () => {
  it("boosts one own Digimon and then offers an attack on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_016.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "forTheTurn", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } });
      expect(effect?.actions?.[1]).toMatchObject({ kind: "Attack", optional: true, withoutSuspending: false, target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } });
    }
  });

  it("responds to any 13000+ DP Digimon attacking and digivolves from hand for free", () => {
    const effect = BT25_016.effects?.find((entry) => entry.trigger === "AllTurns");
    const watcher = effect?.actions?.[0];
    expect(watcher).toMatchObject({ event: "whenAttacking", sourceFilter: { controllerDefault: "any", kind: ["Digimon"], dp: { op: "gte", value: 13000 } } });
    const subTrigger = watcher as { actions?: unknown[] } | undefined;
    expect(subTrigger?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], payCost: false, optional: true, into: { nameOrTrait: [{ tokens: ["Marsmon", "Callismon"], match: "name" }] } });
  });

  it("preserves inherited Security Attack +1", () => {
    expect(BT25_016.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ isInherited: true, keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }] }),
    ]));
  });
});
