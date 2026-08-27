import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-091.js";

describe("BT6-091 Sora Takenouchi & Mimi Tachikawa", () => {
  it("gains 2 memory at turn start when the opponent has no level 4 or lower Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-091", as: "tamer" }] }, 1: { battleArea: ["BT6-016"] } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
  });

  it("may suspend when an own purple Digimon attacks to draw 1 then trash 1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-091", as: "tamer" },
            { card: "BT6-068", as: "attacker" },
          ],
          hand: [{ card: "BT6-069", as: "oldHand" }],
          deck: [{ card: "BT6-070", as: "drawn" }],
        },
        1: { security: ["BT6-074", "BT6-076"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("oldHand").instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("tamer").isSuspended &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("oldHand").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("oldHand").instanceId);
  });
});
