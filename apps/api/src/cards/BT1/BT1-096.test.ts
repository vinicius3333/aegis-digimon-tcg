import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-096.js";

describe("BT1-096 Mad Dog Fire", () => {
  it("gives exactly 1 Digimon +3000 DP for the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-028", as: "target" },
            { card: "BT1-029", as: "other" },
          ],
          hand: [{ card: "BT1-096", as: "option" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    const otherBaseDP = s.perm("other").currentDP;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 6000);

    expect(s.perm("other").currentDP).toBe(otherBaseDP);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("resolves without a target decision when the user controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-086"],
        hand: [{ card: "BT1-096", as: "option" }],
      },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws 1, then adds itself to hand from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT1-096", as: "securityOption", faceUp: true }],
        deck: [{ card: "BT1-029", as: "drawn" }],
      },
    });
    const optionId = s.inst("securityOption").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId, optionId]);
  });
});
