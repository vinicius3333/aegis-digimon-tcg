import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-055.js";
import "../index.js";

describe("EX11-055 Chitose Horaiji", () => {
  it("trashes a Composite card, draws, and gains memory at start of main", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-055", as: "chitose" }], hand: [{ card: "EX11-027", as: "cost" }], deck: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("chitose"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-001")).toBe(true);
  });
});
