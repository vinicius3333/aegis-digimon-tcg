import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-024.js";

describe("BT23-024 Poseidomon", () => {
  it("declares Evade and Link +1", () => {
    const keywords = compiled.effects.flatMap(
      (entry) => entry.actions?.filter((action: any) => action.kind === "GainKeyword") ?? [],
    );
    expect(keywords).toEqual([
      expect.objectContaining({ keyword: { keyword: "Evade", raw: "＜Evade＞" }, duration: "permanent" }),
      expect.objectContaining({ keyword: { keyword: "Link", amount: 1, raw: "＜Link +1＞" }, duration: "permanent" }),
    ]);
  });

  it("may link an Appmon from hand or its digivolution cards when digivolving or attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Link",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          count: 1,
        },
        payCost: false,
        optional: true,
      });
    }
  });

  it("once per turn reacts only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        { kind: "ArmSuspendRestriction", duration: "untilOpponentTurnEnd" },
      ],
    });
  });
});
