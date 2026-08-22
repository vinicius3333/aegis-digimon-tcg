import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-059.js";
import "../index.js";

describe("EX11-059 Reina Oumi", () => {
  it("trashes an NSo card, draws, and gains memory at start of main", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-059", as: "reina" }], hand: [{ card: "BT26-062", as: "cost" }], deck: ["BT1-001"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-001")).toBe(true);
  });
});
