import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-019.js";
import "./EX2-021.js";
import "./EX2-023.js";
import "./EX2-024.js";
import "./EX2-060.js";
import "./EX2-066.js";
import "./EX2-068.js";

describe("EX2 mixed Tamers, Plug-Ins, and evolution lines", () => {
  it("stacks the Renamon line's inherited Option reactions with Sakuyamon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX2-024",
            as: "sakuyamon",
            under: ["EX2-019", "EX2-021", "EX2-023"],
          },
          { card: "EX2-060", as: "rika" },
        ],
        hand: [{ card: "EX2-066", as: "plugIn" }],
      },
      1: { battleArea: [{ card: "EX2-015", dp: 8000, as: "opponent" }] },
    }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("plugIn").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.memory === 9 &&
      s.perm("opponent").currentDP === 1000 &&
      observe(s.engine).keywordAmount(s.perm("sakuyamon"), "SecurityAttack") === 1,
    );

    expect(s.state.memory).toBe(9);
    expect(s.perm("opponent").currentDP).toBe(1000);
    expect(observe(s.engine).keywordAmount(s.perm("sakuyamon"), "SecurityAttack")).toBe(1);
    assertNoLoudGap(s);
  });

  it("lets Rika use a Plug-In for free and still triggers Renamon's inherited payoff", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-021", under: ["EX2-019"], as: "kyubimon" },
          { card: "EX2-060", as: "rika" },
        ],
        hand: [{ card: "EX2-068", as: "plugIn" }],
      },
      1: { security: ["BT1-001"] },
    }, { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("kyubimon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("rika").isSuspended &&
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("plugIn").instanceId) &&
      s.state.memory === 1 &&
      observe(s.engine).hasKeyword(s.perm("kyubimon"), "Jamming"),
    );

    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("plugIn").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("kyubimon"), "Jamming")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("kyubimon"), "cantBeBlocked")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not let a similarly colored but wrong-name attacker trigger Rika", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-018", as: "wrongName" },
          { card: "EX2-060", as: "rika" },
        ],
        hand: [{ card: "EX2-068", as: "plugIn" }],
      },
      1: { security: ["BT1-001"] },
    }, { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true });
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("wrongName").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("rika").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugIn").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
