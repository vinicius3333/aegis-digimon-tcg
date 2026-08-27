import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-006.js";

describe("BT4-006 Xiaomon", () => {
  it("grants Retaliation to its host while there are at least 10 cards in trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-081", dp: 1000, as: "host", under: ["BT4-006", "BT3-076"] }],
        trash: Array.from({ length: 10 }, () => "BT1-010"),
      },
      1: { battleArea: [{ card: "BT1-057", dp: 5000, suspended: true, as: "defender" }] },
    });
    await s.engine.recomputeContinuousEffects();
    const hostId = s.perm("host").permanentId;
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId) &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId),
      5000,
    );

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(false);
  });

  it("does not grant Retaliation with only 9 cards in trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-081", dp: 1000, as: "host", under: ["BT4-006", "BT3-076"] }],
        trash: Array.from({ length: 9 }, () => "BT1-010"),
      },
      1: { battleArea: [{ card: "BT1-057", dp: 5000, suspended: true, as: "defender" }] },
    });
    await s.engine.recomputeContinuousEffects();
    const hostId = s.perm("host").permanentId;
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId), 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(true);
  });

  it("does not grant Retaliation to its host during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-081", dp: 1000, as: "host", under: ["BT4-006", "BT3-076"] }],
        trash: Array.from({ length: 10 }, () => "BT1-010"),
      },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(false);
  });
});
