import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-044.js";

describe("BT18-044 FunBeemon", () => {
  it("places the exact Royal Base card from hand at security bottom and adds the prior top card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-044", as: "funbeemon" }, { card: "BT18-046", as: "royalBase" }],
          security: [{ card: "BT1-001", as: "topSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("funbeemon").instanceId })).toEqual({ ok: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.state.players[0]!.battleArea[0]!);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT18-046");
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-046")).toBe(false);
  });
});
