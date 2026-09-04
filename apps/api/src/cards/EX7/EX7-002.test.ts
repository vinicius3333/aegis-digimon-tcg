import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-002.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-002 Hiyarimon", () => {
  it("inherits once-per-turn draw when attacking if the opponent has no stacked Digimon", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "opponentHasNone" } }],
    }));

  it("draws through a real attack only when the opponent has no digivolution cards", async () => {
    const s = setupEngine({
      0: {
        hand: ["AD1-001"],
        deck: ["AD1-001"],
        battleArea: [{ card: "AD1-001", as: "host", dp: 5000, under: ["EX7-002"] }],
      },
      1: { battleArea: [{ card: "AD1-001", as: "target", dp: 3000, suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("does not draw when the opposing Digimon has a digivolution card", async () => {
    const s = setupEngine({
      0: {
        hand: ["AD1-001"],
        deck: ["AD1-001"],
        battleArea: [{ card: "AD1-001", as: "host", dp: 5000, under: ["EX7-002"] }],
      },
      1: {
        battleArea: [{ card: "AD1-001", as: "target", dp: 3000, suspended: true, under: ["BT1-009"] }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once across two legal attacks by the same inherited host", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-028", "BT1-028"],
        battleArea: [{ card: "BT1-027", as: "host", under: ["EX7-002"] }],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "first", suspended: true },
          { card: "BT1-028", as: "second", suspended: true },
        ],
      },
    });
    await s.ready();
    for (const defender of ["first", "second"]) {
      const defenderId = s.perm(defender).permanentId;
      await advance(s.engine).verb.suspend([defenderId]);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !observe(s.engine).isAttacking() &&
          !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId),
      );
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId)).toBe(false);
      expect(s.state.players[0]!.hand).toHaveLength(1);
      expect(s.state.players[0]!.deck).toHaveLength(1);
      if (defender === "first") await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    }
    assertNoLoudGap(s);
  });
});
