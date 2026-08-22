import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-086.js";

describe("BT26-086 compiled behavior", () => {
  it("proves Assembly, Link +6, intrinsic keywords, and the link-then-attack windows", () => {
    expect(compiled.coverage).toBe("partial");
    expect(compiled.residual).toHaveLength(1);
    expect(compiled.assemblyRequirement).toEqual([{ reduceCost: 7, materials: [{ traits: ["Seven Code"], count: 7, differentNames: true }] }]);
    expect(compiled.keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "Rush" }),
      expect.objectContaining({ keyword: "Reboot" }),
      expect.objectContaining({ keyword: "Blocker" }),
      expect.objectContaining({ keyword: "Link", amount: 6 }),
    ]));
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toEqual([
        expect.objectContaining({ kind: "Link", from: ["digivolutionCards"], payCost: false, optional: true, target: { count: 7, upTo: true } }),
        expect.objectContaining({ kind: "Attack", withoutSuspending: true, optional: true }),
      ]);
    }
  });

  it("keeps the different-name and seven-link conditional seams explicit", () => {
    expect(compiled.residual[0]).toContain("different-names");
    expect(compiled.residual[0]).toContain("seven-link");
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Delete", optional: true }, { kind: "RawUnparsed" }] }] });
  });
});
