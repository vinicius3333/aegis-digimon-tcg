import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-022.js";

describe("BT23-022 Oujamon", () => {
  it("declares Raid", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Raid", raw: "＜Raid＞" }]);
  });

  it("shares one Once Per Turn link activation across When Digivolving and When Attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect.actions[0]).toMatchObject({
        kind: "Link",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
        payCost: false,
        optional: true,
      });
    }
  });

  it("once per turn may unsuspend only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true }],
    });
  });
});
