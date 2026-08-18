import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-097.js";

describe("BT1-097 Boring Storm", () => {
  it("draws exactly the top card and trashes the used Option", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-028"],
        hand: [{ card: "BT1-097", as: "option" }],
        deck: [
          { card: "BT1-029", as: "drawn" },
          { card: "BT1-030", as: "remaining" },
        ],
      },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
  });

  it("draws exactly 2 from security without adding itself to hand", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT1-097", as: "securityOption", faceUp: true }],
        deck: [
          { card: "BT1-029", as: "first" },
          { card: "BT1-030", as: "second" },
          { card: "BT1-031", as: "remaining" },
        ],
      },
    });
    const securityOptionId = s.inst("securityOption").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === securityOptionId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
  });
});
