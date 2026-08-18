import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-05.js";

describe("ST9-05 Paildramon", () => {
  it("does not bottom-deck on an ordinary digivolution", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST9-04", as: "base" }], hand: [{ card: "ST9-05", as: "paildramon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("paildramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST9-05");
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(true);
  });

  it("bottom-decks an opponent Digimon with 6000 DP or less after DNA digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-04", as: "blue" }, { card: "ST9-09", as: "green" }],
          hand: [{ card: "ST9-05", as: "paildramon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
      instanceId: s.inst("paildramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.deck.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("can attack in the same turn it DNA digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-04", as: "blue", enteredThisTurn: true },
            { card: "ST9-09", as: "green", enteredThisTurn: true },
          ],
          hand: [{ card: "ST9-05", as: "paildramon" }],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-002", "BT1-003"] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.turnCount = 3;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
      instanceId: s.inst("paildramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST9-05"));
    const paildramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "ST9-05")!;

    expect(paildramon.canAttackPlayer).toBe(true);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: paildramon.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("unsuspends after the first attack only and cannot attack a third time", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST9-05", as: "paildramon" }] },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
    }, { autoOrderTriggers: true });

    for (let attack = 0; attack < 2; attack += 1) {
      expect(s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      })).toEqual({ ok: true });
      await settle(() =>
        !((s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking) &&
        s.state.players[1]!.security.length === 2 - attack,
      );
    }

    expect(s.perm("paildramon").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("paildramon").permanentId,
      target: { kind: "player" },
    }).ok).toBe(false);
  });
});
