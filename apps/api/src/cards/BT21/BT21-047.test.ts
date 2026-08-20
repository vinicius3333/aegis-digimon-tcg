import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-047.js";
import "../index.js";

describe("BT21-047 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("resolves the public On Play reveal by adding App Driver and Appmon cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT21-047", as: "navimon" }], deck: [{ card: "BT21-084", as: "appDriver" }, { card: "BT21-097", as: "appmon" }, { card: "BT1-009", as: "rest" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("navimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("appDriver").instanceId));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("appDriver").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.length + s.state.players[0]!.trash.length).toBe(2);
  });
});
