import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("Barrier on separate battle deletions (Discord bug 1556063217623629944)", () => {
  it.each([true, false])("offers Barrier again on the next attack (accept second: %s)", async (acceptSecond) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-023", as: "first" },
          { card: "BT1-023", as: "second" },
        ],
      },
      1: {
        battleArea: [{ card: "EX13-030", as: "defender", suspended: true }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    const defenderId = s.perm("defender").permanentId;
    for (const [index, alias] of ["first", "second"].entries()) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.filter(({ kind }) => kind === "barrierPrompt").length > index || !observe(s.engine).isAttacking(),
      );
      expect(s.events.filter(({ kind }) => kind === "barrierPrompt")).toHaveLength(index + 1);
      expect(
        s.engine.applyIntent(1, {
          type: "respondBarrier",
          permanentId: defenderId,
          accept: index === 0 || acceptSecond,
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    }
    expect(s.state.players[1]!.security).toHaveLength(acceptSecond ? 1 : 2);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId)).toBe(acceptSecond);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also allows repeat payments through the battle-deletion verb, but never for effect deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX13-030", as: "defender" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await s.ready();
    const defenderId = s.perm("defender").permanentId;
    // Exercise the second production Barrier path directly: ordinary and forced field
    // battles enter CombatController, while removal verbs can receive a byBattle cause.
    for (let index = 0; index < 2; index++) {
      const removal = advance(s.engine).verb.deletePermanent([defenderId], "byBattle");
      await settle(
        () =>
          s.events.filter(({ kind }) => kind === "barrierPrompt").length > index ||
          s.state.players[0]!.battleArea.length === 0,
      );
      expect(s.events.filter(({ kind }) => kind === "barrierPrompt")).toHaveLength(index + 1);
      expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: defenderId, accept: true })).toEqual({
        ok: true,
      });
      await removal;
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
    }
    await advance(s.engine).verb.deletePermanent([defenderId], "byEffect");
    expect(s.events.filter(({ kind }) => kind === "barrierPrompt")).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
