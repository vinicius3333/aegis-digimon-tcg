import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST7/ST7-03.js";
import "../ST7/ST7-05.js";
import "../ST7/ST7-08.js";
import "../ST7/ST7-09.js";
import "../P/P-041.js";
import "./EX2-073.js";

describe("ST7 Gallantmon into EX2 Crimson Mode deck", () => {
  it("turns Crimson Mode's digivolve deletion into draw, memory, Security Attack, and a four-card security swing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST7-09",
              as: "gallantmon",
              under: ["P-041", "ST7-03", "ST7-05", "ST7-08"],
            },
          ],
          hand: [{ card: "EX2-073", as: "crimsonMode" }],
          deck: [
            { card: "BT1-009", as: "digivolveDraw" },
            { card: "BT1-010", as: "attackDraw" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "highest", dp: 10000 },
            { card: "BT1-010", as: "small", dp: 3000 },
          ],
          trash: [
            "BT1-001", "BT1-002", "BT1-003",
            "BT1-004", "BT1-005", "BT1-006",
            "BT1-007", "BT1-008", "BT1-011",
          ],
          security: ["BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    const highestId = s.perm("highest").permanentId;
    const smallId = s.perm("small").permanentId;
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("gallantmon").permanentId,
      instanceId: s.inst("crimsonMode").instanceId,
    })).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId) &&
        s.state.players[0]!.hand.some((card) =>
          card.instanceId === s.inst("digivolveDraw").instanceId,
        ) &&
        observe(s.engine).keywordAmount(s.perm("gallantmon"), "SecurityAttack") === 1,
      5000,
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.trash).toHaveLength(10);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gallantmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        s.state.players[0]!.hand.some((card) =>
          card.instanceId === s.inst("attackDraw").instanceId,
        ) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === smallId) &&
        !observe(s.engine).isAttacking(),
      5000,
    );

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) =>
      card.instanceId === s.inst("attackDraw").instanceId,
    )).toBe(true);
    assertNoLoudGap(s);
  });
});
