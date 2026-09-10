import { EffectDuration, EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT5/BT5-032.js";
import { compiled } from "./BT1-101.js";

describe("BT1-101 Howling Crusher", () => {
  it("encodes Security as activation of the printed Main effect", () => {
    expect(compiled.effects[1]).toEqual({
      trigger: "Security",
      actions: [{ kind: "ActivateMain" }],
      isSecurity: true,
    });
  });

  it("trashes every source under every opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-028"], hand: [{ card: "BT1-101", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT2-047", as: "first", under: ["BT1-066", "BT1-071"] },
            { card: "BT2-060", as: "second", under: ["BT2-056"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").stack.length === 0 && s.perm("second").stack.length === 0);
    expect(s.state.players[1]!.trash).toHaveLength(3);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT1-101", as: "securityOption", faceUp: true }] },
      1: { battleArea: [{ card: "BT2-047", as: "target", under: ["BT1-066", "BT1-071"] }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("trashes sources from an opposing stack reached by public hatch, evolution, and move", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-028"],
        hand: [{ card: "BT1-101", as: "option" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
      },
      1: {
        eggDeck: [{ card: "BT1-003", as: "egg" }],
        hand: [
          { card: "BT1-028", as: "lv3" },
          { card: "BT1-032", as: "lv4" },
          { card: "BT1-038", as: "lv5" },
        ],
        deck: [
          "BT1-009",
          "BT1-010",
          "BT1-011",
          "BT1-012",
          "BT1-013",
          "BT1-014",
          "BT1-015",
          "BT1-016",
          "BT1-017",
          "BT1-018",
          "BT1-019",
          "BT1-020",
        ],
      },
    });
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.breeding?.topCard?.cardId === "BT1-003");
    const permanentId = s.state.players[1]!.breeding!.permanentId;
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 8;
    for (const name of ["lv3", "lv4", "lv5"] as const) {
      expect(s.engine.applyIntent(1, { type: "digivolve", permanentId, instanceId: s.inst(name).instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.breeding?.topCard?.instanceId === s.inst(name).instanceId);
    }
    expect(s.state.players[1]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["BT1-003", "BT1-028", "BT1-032"]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.permanentId === permanentId));
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 3);
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === permanentId)!.stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-032", "BT1-028", "BT1-003"]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not end an already-declared attack after Security removes the attacker's sources (Q1311)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-081",
              as: "attacker",
              dp: 10000,
              under: ["BT1-066", "BT1-076"],
            },
          ],
        },
        1: {
          battleArea: [{ card: "BT5-032", as: "hexeblaumon" }],
          security: ["BT1-101", "BT1-009"],
        },
      },
      // BT1-081's own [EndOfAttack] optional Unsuspend prompt is unrelated to what this
      // test proves (BT1-101's Q1311 behavior); decline it so its own decision never
      // stalls the settle below.
      { autoDeclineOptional: true },
    );
    advance(s.engine).ledgers.continuous.addKeywordGrant(
      s.perm("attacker").permanentId,
      "SecurityAttack",
      EffectDuration.Permanent,
      1,
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking(), 1000);

    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((entry) => entry.permanentId === s.perm("attacker").permanentId)).toBe(
      true,
    );
  });
});
