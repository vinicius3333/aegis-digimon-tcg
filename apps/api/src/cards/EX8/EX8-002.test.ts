import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-002.js";

describe("EX8-002", () => {
  it("inherits a once-per-turn attack effect that gains 1 memory at 0 or less memory", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtMost", value: 0 } }],
    }));

  it("gains 1 memory when the inherited host attacks at 0 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-002"] }] } });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
