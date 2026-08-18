import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-071.js";

describe("BT10-071 Gazimon", () => {
  it("grants Retaliation at exactly 10 trash and updates live across the boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-071"] }],
        hand: [{ card: "BT1-001", as: "tenthCard" }],
        trash: Array.from({ length: 9 }, () => "BT1-001"),
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(false);

    await advance(s.engine).verb.trash([s.inst("tenthCard").instanceId]);

    expect(s.state.players[0]!.trash).toHaveLength(10);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    assertNoLoudGap(s);
  });

  it("deletes the battle opponent with Retaliation when 10 cards were already in trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-071"] }],
        trash: Array.from({ length: 10 }, () => "BT1-001"),
      },
      1: { battleArea: [{ card: "BT1-060", as: "defender", suspended: true }] },
    });
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
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId) &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId),
    );

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not gain Retaliation retroactively when its deleted stack raises trash from 9 to 10+ (Q1995)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-071"] }],
        trash: Array.from({ length: 9 }, () => "BT1-001"),
      },
      1: { battleArea: [{ card: "BT1-060", as: "defender", suspended: true }] },
    });
    const hostId = s.perm("host").permanentId;
    const defenderId = s.perm("defender").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId));

    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(10);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId)).toBe(true);
    assertNoLoudGap(s);
  });
});
