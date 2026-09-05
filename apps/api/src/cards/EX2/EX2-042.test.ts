import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-042.js";
import "./EX2-043.js";

describe("EX2-042 Mephistomon", () => {
  it("draws 2 and trashes 2 cards from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-042", as: "mephistomon" }, "BT1-001", "BT1-002"],
          deck: [
            { card: "BT1-003", as: "drawOne" },
            { card: "BT1-004", as: "drawTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mephistomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("trashes a hand card to gain memory through its inherited once-per-turn effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-042"] }],
          hand: [
            { card: "BT1-001", as: "costCard" },
            { card: "BT1-002", as: "secondCard" },
          ],
        },
        1: { security: ["BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costCard").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondCard").instanceId);

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondCard").instanceId);
  });

  it("does not offer the inherited cost when there is no card in hand to trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-042"] }] },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
