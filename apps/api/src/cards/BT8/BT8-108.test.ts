import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-108.js";

describe("BT8-108 Mist Memory Boost!", () => {
  it("trashes two deck cards, draws one, and enters the battle area", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT8-108", as: "option" }],
        deck: ["BT8-001", "BT8-002", "BT8-003"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT8-108"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT8-001", "BT8-002"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT8-003")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT8-108")).toBe(true);
  });

  it("places itself in its owner's battle area from Security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT8-108", as: "securityOption", faceUp: true }] },
    });

    await advance(s.engine).fireForInstance(
      EffectTiming.SecuritySkill,
      s.inst("securityOption"),
    );
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT8-108"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT8-108")).toBe(true);
  });
});
