import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-006.js";

describe("BT24-006 Tapmon", () => {
  it("draws one and trashes one hand card when linked", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenLinked" });
    expect(inherited.actions[0].actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
    ]);
  });
});
