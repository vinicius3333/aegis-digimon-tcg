import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-072.js";

describe("EX1-072 Emergency Program Shutdown!", () => {
  it("prevents the opponent from using Option cards until the end of their next turn", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-072", as: "shutdown" }], battleArea: [{ card: "BT11-095", as: "blueSource" }] },
      1: { hand: [{ card: "EX1-069", as: "opponentOption" }], battleArea: [{ card: "EX1-047", as: "blackSource" }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shutdown").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "EX1-072"));
    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentOption").instanceId }).ok).toBe(
      false,
    );
  });

  it("from security restricts the opponent for the turn and returns to its owner's hand", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX1-069", as: "opponentOption" }],
        battleArea: [{ card: "EX1-047", as: "blackSource" }],
      },
      1: { security: [{ card: "EX1-072", as: "shutdown", faceUp: true }] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    const shutdownId = s.inst("shutdown").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("shutdown"));

    expect(s.state.players[1]!.hand.some((c) => c.instanceId === shutdownId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === shutdownId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("opponentOption").instanceId }).ok).toBe(
      false,
    );
  });
});
