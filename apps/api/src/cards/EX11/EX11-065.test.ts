import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-065.js";

describe("EX11-065 Close", () => {
  it("trashes a Mineral card from a digivolution stack to gain memory", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-065", as: "close" }], hand: ["EX8-051"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("close"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-051")).toBe(true);
  });
});
