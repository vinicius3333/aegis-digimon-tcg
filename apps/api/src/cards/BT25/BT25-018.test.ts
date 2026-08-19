import { describe, expect, it } from "vitest";
import { compiled as BT25_018 } from "./BT25-018.js";
import "../index.js";

describe("BT25-018 Apollomon", () => {
  it("reduces its play cost against an opponent Digimon at 12000 DP or more", () => {
    const staticEffect = BT25_018.effects?.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions?.[0]).toMatchObject({ kind: "Replacement", event: "wouldBePlayed" });
    const nested = staticEffect?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(nested?.actions?.[0]).toMatchObject({
        mode: "reduceCost",
        amount: 5,
        condition: { kind: "opponentHas", filter: { dp: { op: "gte", value: 12000 } } },
    });
  });

  it("scales opponent DP by your Digimon count and deletes relative to this card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_018.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -2000,
        scaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"] }, unit: "cards" },
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
      });
      expect(effect?.actions?.[1]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", relativeToSource: true } }, count: 1 } });
    }
  });

  it("keeps the end-turn DNA-then-attack sequence and inherited deletion", () => {
    const endTurn = BT25_018.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(endTurn?.actions?.[0]).toMatchObject({ kind: "DnaDigivolve", payCost: true, optional: true, into: { zone: "hand" } });
    expect(endTurn?.actions?.[1]).toMatchObject({ kind: "Attack", optional: true, withoutSuspending: false });
    expect(BT25_018.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
  });
});
