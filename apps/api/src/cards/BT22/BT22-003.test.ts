import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-003.js";

describe("BT22-003 Tapmon", () => {
  it("reduces one opposing Digimon by 2000 when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    const trigger = effect?.actions[0] as any;
    expect(trigger).toMatchObject({ kind: "SubTrigger", event: "whenLinked", triggerFilter: { isSelfRef: true } });
    expect(trigger.actions).toEqual([
      {
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: -2000,
        duration: "forTheTurn",
      },
    ]);
  });
});
