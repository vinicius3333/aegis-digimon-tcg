import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST1/ST1-12.js";
import "../ST7/ST7-04.js";
import "./EX1-001.js";
import "./EX1-004.js";
import "./EX1-008.js";
import "./EX1-009.js";

describe("EX1 mixed Agumon and Greymon line", () => {
  it("combines search, Tamer play, Dragonkin Piercing, and Blocker deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-009",
              as: "warGreymon",
              under: ["EX1-001", "EX1-004", "EX1-008"],
            },
            { card: "ST1-12", as: "existingTai" },
          ],
          hand: [{ card: "ST1-12", as: "playedTai" }],
          deck: [{ card: "EX1-001", as: "searchedAgumon" }, "BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "ST7-04", as: "blocker" }],
          security: ["BT1-004", "BT1-005"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("warGreymon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("warGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("playedTai").instanceId,
        ) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("searchedAgumon").instanceId) &&
        s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("searchedAgumon").instanceId);
    assertNoLoudGap(s);
  });
});
