import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-089.js";
import "./BT3-105.js";

describe("BT3-105 Breath of the Gods", () => {
  it("grants Reboot and protection from DP reduction and returns", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-059", as: "target" },
            { card: "BT3-070", as: "untouched" },
          ],
          hand: [{ card: "BT3-105", as: "option" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("target"), "Reboot") &&
        observe(s.engine).isRestricted(s.perm("target"), "dpImmune") &&
        observe(s.engine).isRestricted(s.perm("target"), "beReturned"),
    );
    expect(observe(s.engine).isRestricted(s.perm("target"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "beReturned")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("untouched"), "Reboot")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("untouched"), "dpImmune")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("untouched"), "beReturned")).toBe(false);
  });

  it("prevents the opponent's Digimon from attacking players from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-105", as: "securityOption", faceUp: true }] },
      1: { battleArea: [{ card: "BT3-059", as: "opponent" }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(true);
  });
});

describe("BT3-105 Breath of the Gods — KB Q&A rulings", () => {
  const setupMimiAttackInto = (topSecurityCard: string) =>
    setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-089", as: "mimi" },
            { card: "BT1-078", as: "greenLevelFive" },
            { card: "BT1-012", as: "attacker", dp: 20000 },
          ],
          breeding: { card: "BT1-064", as: "raised" },
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "restingTarget", suspended: true }],
          security: [{ card: topSecurityCard, as: "checked" }, "BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );

  const attackPlayerThenMoveFromBreeding = async (s: ReturnType<typeof setupMimiAttackInto>) => {
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("checked").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    const mimiEffects = observe(s.engine).activatableEffects(s.perm("mimi"));
    expect(mimiEffects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("mimi").topCard.instanceId,
        effectKey: mimiEffects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined && s.state.pendingDecision === undefined);
    const raisedId = s.perm("raised").permanentId;
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === raisedId)).toBe(true);
    return raisedId;
  };

  it("stops a Digimon moved from breeding after the security effect from attacking players (Q1142)", async () => {
    const s = setupMimiAttackInto("BT3-105");
    const raisedId = await attackPlayerThenMoveFromBreeding(s);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: raisedId, target: { kind: "player" } }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: raisedId,
        target: { kind: "permanent", permanentId: s.perm("restingTarget").permanentId },
      }),
    ).toEqual({ ok: true });

    const control = setupMimiAttackInto("BT1-009");
    const controlRaisedId = await attackPlayerThenMoveFromBreeding(control);
    expect(
      control.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: controlRaisedId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});
