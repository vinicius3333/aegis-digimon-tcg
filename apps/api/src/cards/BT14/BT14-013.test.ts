import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-013.js";

describe("BT14-013", () => {
  it("registers start-main digivolution cost reduction and inherited end-turn attack", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Replacement", event: "wouldDigivolve", amount: 1 }],
    });
    expect(compiled.effects[1]).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Attack", optional: true }],
    });
  });
});
