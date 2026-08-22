import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-084.js";

describe("BT21-084 Haru Shinkai", () => {
  it("sets memory at the start of turn, draws on linking, and fuses from hand", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          expect.objectContaining({
            kind: "SetMemory",
            value: 3,
            condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
          }),
        ],
      }),
    );
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
    });
    const linkedActions = (yourTurn?.actions[0] as { actions?: unknown[] } | undefined)?.actions;
    expect(linkedActions?.[0]).toMatchObject({ kind: "Draw", amount: 1, cost: { kind: "suspend" } });
    expect(yourTurn?.actions[1]).toMatchObject({
      kind: "AppFuse",
      from: ["hand"],
      into: { kind: ["Digimon"] },
      optional: true,
    });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
