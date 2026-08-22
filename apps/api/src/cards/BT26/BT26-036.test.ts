import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-036.js";
import "../index.js";

describe("BT26-036 Lalamon", () => {
  it("compiles the two reveal windows and inherited once-per-turn suspension", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["OnPlay", "OnMove", "WhenAttacking"]);
    expect(compiled.effects[2]).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend" }] });
  });
  it("reveals three and adds a matching card while returning the rest", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT26-036", as: "self" }], deck: [{ card: "BT26-061", as: "match" }, { card: "BT1-001" }, { card: "BT1-002" }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "BT26-061"));
    expect(s.state.players[0]!.deck.length).toBeGreaterThan(0);
  });
});
