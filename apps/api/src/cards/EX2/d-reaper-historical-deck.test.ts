import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX2 D-Reaper historical deck gauntlet", () => {
  it("converts Mother's Searchers into a free Rush Reaper, repeated attacks, inherited DP, and Gatekeeper recovery", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "EX2-007",
            as: "mother",
            under: Array.from({ length: 8 }, () => "EX2-046"),
          }],
          hand: [
            { card: "EX2-055", as: "reaper" },
            { card: "EX2-054", as: "gatekeeper" },
          ],
          deck: [{ card: "BT1-009", as: "recovered" }],
          security: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-012", "BT1-013", "BT1-014", "BT1-015"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderTriggers: true,
      },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("reaper").instanceId,
    })).toEqual({ ok: true });
    await settle(() => {
      const reaper = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard?.cardId === "EX2-055",
      );
      return reaper !== undefined &&
        s.perm("mother").stack.length === 1 &&
        observe(s.engine).hasKeyword(reaper, "Rush");
    });

    const reaper = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "EX2-055",
    )!;
    const baseDp = reaper.currentDP;
    expect(s.state.memory).toBe(10);
    expect(observe(s.engine).hasKeyword(reaper, "Rush")).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: reaper.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !observe(s.engine).isAttacking() &&
      !reaper.isSuspended &&
      reaper.stack.length === 2 &&
      reaper.currentDP === baseDp + 2000
    );

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: reaper.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !observe(s.engine).isAttacking() &&
      !reaper.isSuspended &&
      reaper.stack.length === 4 &&
      reaper.currentDP === baseDp + 4000
    );

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX2-046")).toHaveLength(3);

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("gatekeeper").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.security.length === 3 &&
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX2-054")
    );

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(
      s.inst("recovered").instanceId,
    );
  });
});
