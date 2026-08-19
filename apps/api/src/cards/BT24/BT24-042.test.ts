import { describe, expect, it } from "vitest";
import { compiled as BT24_042 } from "./BT24-042.js";

describe("BT24-042 Goblimon", () => {
  it("reduces Demon/Titan digivolution costs on your turn", () => {
    const replacement = BT24_042.effects?.find(
      (entry) => entry.trigger === "YourTurn" && entry.actions?.[0]?.kind === "Replacement",
    );
    expect(replacement?.actions?.[0]).toMatchObject({
      event: "wouldDigivolve",
      into: { nameOrTrait: [{ tokens: ["Demon", "Titan"], match: "trait" }] },
    });
  });
  it("keeps the inherited once-per-turn trash-triggered digivolution", () => {
    const inherited = BT24_042.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).event).toBe("whenHandTrashed");
  });
});
