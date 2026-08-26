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
          { card: "BT15-008", as: "muchomon" },
          { card: "BT1-009", as: "redAttacker" },
        ],
        deck: [
          { card: "BT1-001", as: "drawn" },
          { card: "BT1-002", as: "left" },
        ],
      },
      1: { security: ["BT1-001", "BT1-001"] },
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
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw for a non-red attacker or an attack targeting a Digimon", async () => {
    for (const attackPlayer of [true, false]) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT15-008", as: "muchomon" },
            { card: attackPlayer ? "BT1-045" : "BT1-009", as: "attacker" },
          ],
          deck: [{ card: "BT1-001", as: "top" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }],
          security: ["BT1-001"],
        },
      });
      await s.ready();
      const targetId = s.perm("target").permanentId;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: attackPlayer
            ? { kind: "player" }
            : { kind: "permanent", permanentId: targetId },
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
