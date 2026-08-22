import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-066.js";

describe("EX11-066 Xeno", () => {
  it("accepts a card with Vemmon in its text for the start-phase cost", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-066", as: "xeno" }], hand: ["P-244"], deck: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("xeno"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "P-244")).toBe(true);
  });
});
