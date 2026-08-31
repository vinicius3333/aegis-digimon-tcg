import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-003.js";

describe("EX10-003 Tumblemon", () => {
  it("models the inherited opponent-attack prevention with the exact three-card cost", () => {
    const effect = compiled.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "EndAttack",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    isSelfRef: true,
                    zone: "digivolutionCards",
                    kind: ["Digimon"],
                    nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
                  },
                  count: 3,
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("trashes exactly 3 matching sources to end an opponent attack before the security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: [
                { card: "EX10-003", as: "tumblemon" },
                { card: "EX10-025", as: "mineral1" },
                { card: "BT13-061", as: "rock" },
                { card: "EX10-025", as: "mineral2" },
              ],
            },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !combat.isAttacking && s.perm("host").stack.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX10-003"]);
  });

  it("cannot pay with 2 matching sources and does not partially trash the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: ["EX10-003", "EX10-025", "BT13-061"],
            },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(3);
  });

  it("leaves the stack intact and lets the attack continue when the optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: ["EX10-003", "EX10-025", "BT13-061", "EX10-025"],
            },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(4);
  });
});
