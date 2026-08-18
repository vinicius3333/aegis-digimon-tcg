import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-028.js";
import "./BT5-032.js";

describe("BT5 Hexeblaumon historical deck gauntlet", () => {
  it("strips the last sources, gains same-attack Jamming and SA+1, then locks that Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT5-032",
              as: "hexeblaumon",
              under: ["BT5-028"],
            },
          ],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            {
              card: "BT4-073",
              as: "sourceTarget",
              under: ["BT1-009", "BT1-010"],
            },
          ],
          security: ["BT9-081", "BT9-081"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("hexeblaumon"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).isRestricted(s.perm("sourceTarget"), "attack")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hexeblaumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("sourceTarget").stack.length === 0 &&
        s.state.players[1]!.security.length === 0 &&
        observe(s.engine).keywordAmount(s.perm("hexeblaumon"), "SecurityAttack") === 1 &&
        observe(s.engine).isRestricted(s.perm("sourceTarget"), "attack") &&
        !observe(s.engine).isAttacking(),
    );

    // Q1310: Jamming is evaluated after the source trash, during this same attack.
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("hexeblaumon").permanentId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("hexeblaumon"), "Jamming")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("hexeblaumon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("sourceTarget"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("sourceTarget"), "block")).toBe(true);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("sourceTarget").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
});
