import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-002.js";

describe("BT17-002", () => {
  it("draws once per turn when a Digimon is played from digivolution cards", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { fromDigivolution: true }, actions: [{ kind: "Draw", amount: 1 }] }] });
  });
});
