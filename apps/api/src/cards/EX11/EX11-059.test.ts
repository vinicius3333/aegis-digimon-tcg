import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-059.js";

describe("EX11-059 Reina Oumi", () => {
  it("trashes an NSo card to draw and gain memory at the start of the main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-059", as: "reina" }], hand: ["EX8-030"], deck: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-030")).toBe(true);
  });
});
