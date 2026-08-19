import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-002.js";

describe("BT24-002 Bukamon", () => {
  it("unsuspends this Digimon, not an arbitrary blue TS Digimon", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const action = inherited.actions[0];
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(action).toMatchObject({
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, isSelf: true },
      cost: { kind: "payMemory", memory: 1 },
    });
  });
});
