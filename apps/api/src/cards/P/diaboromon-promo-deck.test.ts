import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-082.js";
import "./P-013.js";
import "./P-014.js";
import "./P-015.js";
import "./P-016.js";

describe("Diaboromon promo line deck", () => {
  it("counts a token created mid-attack before the promo Diaboromon's security checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-082", as: "tokenMaker" },
            { card: "P-016", as: "promoDiaboromon" },
          ],
        },
        1: {
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
          deck: ["BT1-007"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("promoDiaboromon"), "SecurityAttack")).toBe(2);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("tokenMaker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) =>
      permanent.topCard.cardId === "TOKEN-Diaboromon"
    ));
    await settle(() =>
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking
    );
    await settle();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("promoDiaboromon"), "SecurityAttack")).toBe(3);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("promoDiaboromon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("combines the full promo stack with Diaboromon count scaling", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "P-016",
            as: "attackingDiaboromon",
            under: ["P-013", "P-014", "P-015"],
          },
          { card: "P-016", as: "secondDiaboromon" },
        ],
      },
      1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"] },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(
      s.perm("attackingDiaboromon"),
      "SecurityAttack",
    )).toBe(2);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attackingDiaboromon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    await settle();

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("attackingDiaboromon").currentDP).toBe(12_000);
  });
});
