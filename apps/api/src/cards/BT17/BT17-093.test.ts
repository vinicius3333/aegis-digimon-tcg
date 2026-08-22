import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

describe("BT17-093 Tai Kamiya & Kari Kamiya — hatch trigger", () => {
  it("suspends this Tamer and gains 1 memory when its owner hatches", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-093", as: "tamer" }],
        eggDeck: [{ card: "BT1-001", as: "egg" }],
      },
    });
    s.state.memory = 0;
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "hatchEgg" }).ok).toBe(true);
    for (let i = 0; i < 100 && s.state.memory !== 1; i++) await Promise.resolve();

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]?.breeding?.topCard?.cardId).toBe("BT1-001");
  });

  it("records complete compiled coverage for the hatch trigger", () => {
    const compiled = runtimeCompiledCard("BT17-093")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
