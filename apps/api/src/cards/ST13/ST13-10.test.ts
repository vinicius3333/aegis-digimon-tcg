import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-10.js";

describe("ST13-10 Gladimon", () => {
  it("registers complete residual-free vanilla IR", () => {
    expect(runtimeCompiledCard("ST13-10")).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("digivolves from a black level 3 for 1 memory and preserves the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST13-07", as: "base" }],
        hand: [{ card: "ST13-10", as: "gladimon" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gladimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST13-10");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 4000, currentDP: 4000 });
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST13-07"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
