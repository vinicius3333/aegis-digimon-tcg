import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-018.js";
import "./P-084.js";

describe("P-084 Lopmon", () => {
  it("gives Security Attack -1 with a yellow Tamer", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-084", as: "source" }],
        battleArea: [{ card: "BT1-087", as: "tamer" }],
        security: [
          { card: "BT1-009", as: "security-1" },
          { card: "BT1-009", as: "security-2" },
        ],
      },
      1: { battleArea: [{ card: "BT2-018", as: "target" }] },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-084") &&
      observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 0,
    );
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);

    s.state.turnSeat = 1;
    await s.ready();
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("target").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);

    s.perm("target").isSuspended = false;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack -1 without a yellow Tamer", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-084", as: "source" }], battleArea: [{ card: "BT1-086", as: "blue-tamer" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle();
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });
});
