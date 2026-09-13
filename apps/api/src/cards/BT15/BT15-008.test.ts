import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-008.js";

describe("BT15-008", () => {
  it("draws once per turn only when a red Digimon attacks a player", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Red"] },
          actions: [{ kind: "Draw", amount: 1, condition: { kind: "attackTargetsPlayer" } }],
        },
      ],
    }));

  it("draws at attack declaration when an owned red Digimon attacks the player, once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-008", as: "muchomon", under: ["BT15-001"] },
          { card: "BT1-009", as: "redAttacker", dp: 3000 },
        ],
        deck: [
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-010", as: "left" },
          { card: "BT1-009", as: "nextTurn" },
          { card: "BT1-010", as: "ownerTurnDraw" },
          { card: "BT1-009", as: "ownerNextTurnDraw" },
          { card: "BT1-010", as: "reserve" },
        ],
      },
      1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("redAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("redAttacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("redAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(5);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("redAttacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("redAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nextTurn").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("does not draw for a non-red attacker or an attack targeting a Digimon", async () => {
    for (const attackPlayer of [true, false]) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT15-008", as: "muchomon", under: ["BT15-001"] },
            { card: attackPlayer ? "BT1-045" : "BT1-009", as: "attacker" },
          ],
          deck: [{ card: "BT1-009", as: "top" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }],
          security: ["BT1-009"],
        },
      });
      await s.ready();
      const targetId = s.perm("target").permanentId;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: attackPlayer ? { kind: "player" } : { kind: "permanent", permanentId: targetId },
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        attackPlayer
          ? s.state.players[1]!.security.length === 0
          : !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId),
      );

      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.deck).toHaveLength(1);
    }
  });
});
