import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT17-084.js";

describe("BT17-084 Davis Motomiya & Ken Ichijoji", () => {
  it("encodes the battle-deletion replacement and End of Your Turn attack", () => {
    const compiled = runtimeCompiledCard("BT17-084")!;
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        actions: [expect.objectContaining({ kind: "Replacement", event: "wouldBeDeleted", leaveCause: "battle" })],
      }),
    );
    const endOfTurn = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn");
    expect(endOfTurn?.actions[0]).toMatchObject({ kind: "Attack", optional: true });
  });

  it("records complete compiled coverage for the Free attack clause", () => {
    const compiled = runtimeCompiledCard("BT17-084")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
