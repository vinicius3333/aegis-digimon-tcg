import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-071.js";

describe("EX10-071 Paradise Lost", () => {
  it("returns itself as the cost, trashes security, then attacks without suspending", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(effect.actions).toHaveLength(2);
    expect(effect.actions[0]).toMatchObject({
      kind: "trashSecurityTop",
      controller: "mine",
      count: 1,
      cost: { kind: "return", target: { filter: { isSelfRef: true }, isSelf: true } },
      abortOnDecline: true,
    });
    expect(effect.actions[1]).toMatchObject({ kind: "Attack", withoutSuspending: true });
  });
});
