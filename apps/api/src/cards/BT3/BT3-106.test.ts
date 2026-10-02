import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../P/P-220.js";
import "./BT3-070.js";
import "./BT3-071.js";
import "./BT3-106.js";

describe("BT3-106 Beast Cyclone", () => {
  it("gives Security Attack +1 to all Digimon with Blocker or Reboot", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-070", as: "blocker" },
          { card: "BT3-071", as: "reboot" },
        ],
        hand: [{ card: "BT3-106", as: "option" }],
      },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("blocker"), "SecurityAttack") === 1 &&
        observe(s.engine).keywordAmount(s.perm("reboot"), "SecurityAttack") === 1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("blocker"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("reboot"), "SecurityAttack")).toBe(1);
  });

  it("also gives Security Attack +1 to a Blocker Digimon played afterwards (CR 15-11-2-2)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-070", as: "blocker" }],
        hand: [
          { card: "BT3-106", as: "option" },
          { card: "BT3-070", as: "lateBlocker" },
        ],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-106"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lateBlocker").instanceId })).toEqual({
      ok: true,
    });
    const lateBlocker = () =>
      s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("lateBlocker").instanceId);
    await settle(() => lateBlocker() !== undefined && s.state.pendingDecision === undefined);

    expect(observe(s.engine).keywordAmount(lateBlocker()!, "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("blocker"), "SecurityAttack")).toBe(1);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-106", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });
});

interface DeDigivolvePrimitive {
  deDigivolve(permanentId: string, n: number, opts?: { byEffectSeat?: 0 | 1 }): unknown;
}

describe("BT3-106 Beast Cyclone — KB Q&A rulings", () => {
  const playCyclone = async (s: ReturnType<typeof setupEngine>) => {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-106"));
    await settle();
  };

  it("grants only Security Attack +1 to a Digimon with both Blocker and Reboot (Q1143)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-220", as: "blockerAndReboot" },
          { card: "BT3-067", as: "neither" },
        ],
        hand: [{ card: "BT3-106", as: "option" }],
      },
      1: { security: ["BT3-067", "BT3-067", "BT3-067", "BT3-067"] },
    });
    s.state.memory = 5;
    expect(observe(s.engine).hasKeyword(s.perm("blockerAndReboot"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("blockerAndReboot"), "Reboot")).toBe(true);

    await playCyclone(s);

    expect(observe(s.engine).keywordAmount(s.perm("blockerAndReboot"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("neither"), "SecurityAttack")).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blockerAndReboot").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("drops Security Attack +1 once digivolution or De-Digivolve removes Blocker or Reboot (Q1144)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-070", as: "digivolved" },
          { card: "BT3-070", as: "deDigivolved", under: ["BT3-067"] },
          { card: "BT3-071", as: "keepsReboot" },
        ],
        hand: [
          { card: "BT3-106", as: "option" },
          { card: "BT3-074", as: "noKeywordLevelSix" },
        ],
      },
    });
    s.state.memory = 10;
    await playCyclone(s);
    for (const alias of ["digivolved", "deDigivolved", "keepsReboot"]) {
      expect(observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack")).toBe(1);
    }

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("digivolved").permanentId,
        instanceId: s.inst("noKeywordLevelSix").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("digivolved").topCard.cardId === "BT3-074");
    await settle();

    const primitives = (s.engine as unknown as { primitives: DeDigivolvePrimitive }).primitives;
    await primitives.deDigivolve(s.perm("deDigivolved").permanentId, 1, { byEffectSeat: 1 });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("deDigivolved").topCard.cardId).toBe("BT3-067");

    expect(observe(s.engine).hasKeyword(s.perm("digivolved"), "Blocker")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("digivolved"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("deDigivolved"), "Blocker")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("deDigivolved"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("keepsReboot"), "SecurityAttack")).toBe(1);
  });
});
