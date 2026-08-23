import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-04 Pteromon", () => {
  it("reveals three, adds one Bird/Avian and one Vortex Warriors/LIBERATOR card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST18-04", as: "pteromon" }],
          deck: [{ card: "ST18-03" }, { card: "ST18-08" }, { card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    const p0 = s.state.players[0] as PlayerState;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.hand.some((card) => card.cardId === "ST18-03"));

    expect(p0.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST18-03", "ST18-08"]));
    expect(p0.deck.map((card) => card.cardId)).toContain("BT1-009");
    expect(p0.deck.map((card) => card.cardId)).not.toEqual(expect.arrayContaining(["ST18-03", "ST18-08"]));
  });
});
