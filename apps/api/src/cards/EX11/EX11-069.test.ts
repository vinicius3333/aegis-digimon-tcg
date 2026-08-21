import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-069.js";

describe("EX11-069 Yuuki", () => {
  it("trashes a hand card to gain memory at the start of the main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-069", as: "yuuki" }], hand: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yuuki"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
