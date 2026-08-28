import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT6/BT6-067.js";
import "../BT9/BT9-015.js";
import "../BT12/BT12-017.js";
import "./BT10-013.js";
import { compiled } from "./BT10-042.js";

describe("BT10-042 Venusmon", () => {
  it("encodes the global debuff and Security Attack-gated opponent-turn restrictions", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          expect.objectContaining({
            kind: "GainKeyword",
            target: expect.objectContaining({
              count: "all",
              filter: expect.objectContaining({ controller: "opponent" }),
            }),
            keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: -1 }),
            duration: "untilOpponentTurnEnd",
          }),
        ],
      }),
      expect.objectContaining({
        trigger: "OpponentsTurn",
        actions: [
          expect.objectContaining({
            kind: "Restrict",
            restriction: "attack",
            specificTarget: "source",
            target: expect.objectContaining({ filter: expect.objectContaining({ keywords: ["SecurityAttack"] }) }),
          }),
          expect.objectContaining({
            kind: "DisableTimingEffect",
            timings: ["whenDigivolving", "whenAttacking"],
            target: expect.objectContaining({ filter: expect.objectContaining({ keywords: ["SecurityAttack"] }) }),
          }),
        ],
      }),
    ]);
  });

  it("gives every opponent -1 and still gates a printed +1 attacker whose numeric total is zero (Q1963-Q1966)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-038", as: "base" }],
        hand: [{ card: "BT10-042", as: "venusmon" }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [
          { card: "BT10-013", as: "printedPlus" },
          { card: "BT1-010", as: "plain" },
        ],
        security: ["BT1-001", "BT1-002", "BT1-003"],
        deck: ["BT1-004", "BT1-005"],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("plain"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("printedPlus"), "SecurityAttack")).toBe(0);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("printedPlus"), "whenAttacking")).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("plain"), "whenDigivolving")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("printedPlus").permanentId,
        target: { kind: "permanent", permanentId: s.perm("base").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    assertNoLoudGap(s);
  });

  it("does not affect a Digimon without active Security Attack and only protects Venusmon as an attack target", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-042", as: "venusmon", suspended: true },
          { card: "BT1-043", as: "other", suspended: true },
        ],
        security: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [
          { card: "BT10-013", as: "withKeyword" },
          { card: "BT1-010", as: "plain" },
        ],
        security: ["BT1-001", "BT1-002"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).timingEffectDisabled(s.perm("withKeyword"), "whenAttacking")).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("plain"), "whenAttacking")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("withKeyword").permanentId,
        target: { kind: "permanent", permanentId: s.perm("other").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "permanent", permanentId: s.perm("venusmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    assertNoLoudGap(s);
  });

  it("suppresses a printed-Security-Attack card's When Digivolving before activation (Q1964)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-042", as: "venusmon" },
          { card: "BT1-009", as: "deleteTarget" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-020", as: "base" }],
        hand: [{ card: "BT12-017", as: "emperor" }],
        deck: ["BT1-001"],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-017");

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("deleteTarget").permanentId)).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("base"), "whenDigivolving")).toBe(true);
    assertNoLoudGap(s);
  });

  it("allows the current When Digivolving to grant Security Attack, then suppresses later timings (Q1967)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-042", as: "venusmon" }] },
      1: {
        battleArea: [{ card: "BT1-021", as: "metalgreymon" }],
        hand: [{ card: "BT9-015", as: "xAntibody" }],
        deck: ["BT1-001"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("metalgreymon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metalgreymon").currentDP === 11_000);

    expect(observe(s.engine).keywordAmount(s.perm("metalgreymon"), "SecurityAttack")).toBe(1);
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("metalgreymon"), "whenAttacking")).toBe(true);
    assertNoLoudGap(s);
  });

  it("tracks a conditional Security Attack only while its condition is active (Q1968)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-042", as: "venusmon", suspended: true }] },
      1: { battleArea: [{ card: "BT6-067", as: "gankoomon" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("gankoomon"), "SecurityAttack")).toBe(false);
    expect(observe(s.engine).timingEffectDisabled(s.perm("gankoomon"), "whenAttacking")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("venusmon").permanentId]);
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("gankoomon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("gankoomon"), "whenAttacking")).toBe(true);
    assertNoLoudGap(s);
  });
});
