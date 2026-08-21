import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-060.js";

describe("BT17-060 Armageddemon", () => {
  it("reduces hand play cost by one per eligible trash card, up to thirteen", () => {
    const replacement = compiled.effects.find((entry) => entry.actions[0]?.kind === "Replacement")?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      scaling: { per: 1, unit: "cards" },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1, cost: { kind: "place", target: { count: 13, upTo: true, from: ["trash"] } } }],
    });
    const trashFilter = replacement.actions?.[0]?.cost?.target?.filter;
    expect(trashFilter?.nameOrTrait?.[1]).toMatchObject({ tokens: ["Diaboromon"], match: "text", orPrevious: true });
  });

  it("has Rush, Blocker, Reboot, budget-15 deletion, and unsuspended attack permission", () => {
    expect(compiled.effects.filter((entry) => entry.keywords?.length === 1).flatMap((entry) => entry.keywords?.map((k) => k.keyword))).toEqual(["Rush", "Blocker", "Reboot"]);
    expect(compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger)).map((entry) => entry.actions[0])).toEqual([
      expect.objectContaining({ kind: "DeleteBudget", budget: 15, upTo: true }),
      expect.objectContaining({ kind: "DeleteBudget", budget: 15, upTo: true }),
    ]);
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "GrantCanAttackUnsuspended" });
  });
});
