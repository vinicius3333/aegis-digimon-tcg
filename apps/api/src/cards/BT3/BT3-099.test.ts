import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST7/ST7-08.js";
import module from "./BT3-099.js";

describe("BT3-099 We Have to Stop Fighting!", () => {
  it("matches official metadata and publishes battle-only protection for both players", () => {
    expect(module.cardId).toBe("BT3-099");
    expect(getCardDefinition("BT3-099")).toMatchObject({
      nameEn: "We Have to Stop Fighting!",
      colors: ["Blue"],
      effectText: expect.stringContaining("Neither player's Digimon can be deleted in battle"),
      securityEffectText: expect.stringContaining("Add this card to your hand"),
    });
    expect(getCompiledCard("BT3-099")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [{ kind: "Restrict", restriction: "beDeletedInBattle", duration: "forTheTurn" }],
        },
        { trigger: "Security", actions: [{ kind: "AddToHandSelf" }] },
      ],
    });
  });

  it("prevents battle deletion for both players' Digimon this turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-007", as: "mine" }, "BT3-020"], hand: [{ card: "BT3-099", as: "option" }] },
        1: { battleArea: [{ card: "BT3-009", as: "theirs" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("mine"), "beDeletedInBattle") &&
        observe(s.engine).isRestricted(s.perm("theirs"), "beDeletedInBattle"),
    );
    expect(observe(s.engine).isRestricted(s.perm("mine"), "beDeletedInBattle")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("theirs"), "beDeletedInBattle")).toBe(true);
  });

  it("CR 15-11-2-2: also protects a Digimon played after the Option resolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-007", as: "mine" }, "BT3-020"],
          hand: [
            { card: "BT3-099", as: "option" },
            { card: "BT1-010", as: "late" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("mine"), "beDeletedInBattle") && s.state.pendingDecision === undefined,
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("late").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    const late = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("late").instanceId,
    )!;

    expect(observe(s.engine).isRestricted(late, "beDeletedInBattle")).toBe(true);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-099", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });
});

describe("BT3-099 We Have to Stop Fighting! — KB Q&A rulings", () => {
  async function attackIntoStrongerSecurityDigimon(useOption: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-009", as: "attacker" }, "BT3-020"],
          hand: [{ card: "BT3-099", as: "option" }],
        },
        1: { security: ["BT1-013", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    const optionPlay = useOption
      ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })
      : undefined;
    if (optionPlay?.ok) {
      await settle(() => observe(s.engine).isRestricted(s.perm("attacker"), "beDeletedInBattle"));
    }
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).finishAttack();
    return {
      optionPlay,
      attackerSurvived: s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId),
      trashedIds: s.state.players[0]!.trash.map((card) => card.cardId),
    };
  }

  it("keeps my Digimon from being deleted when it loses a battle against a Security Digimon (Q1132)", async () => {
    const protectedAttack = await attackIntoStrongerSecurityDigimon(true);
    expect(protectedAttack.optionPlay).toEqual({ ok: true });
    expect(protectedAttack.attackerSurvived).toBe(true);
    expect(protectedAttack.trashedIds).not.toContain("BT3-009");

    const unprotectedAttack = await attackIntoStrongerSecurityDigimon(false);
    expect(unprotectedAttack.attackerSurvived).toBe(false);
    expect(unprotectedAttack.trashedIds).toContain("BT3-009");
  });

  it("still lets a [When Attacking] effect delete an opponent's Digimon, while battle deletion stays blocked (Q1133)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-08", as: "attacker" }, "BT3-020"],
          hand: [{ card: "BT3-099", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "effectVictim" },
            { card: "BT1-013", as: "battleVictim", suspended: true },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("effectVictim"), "beDeletedInBattle"));
    const effectVictimId = s.perm("effectVictim").permanentId;
    const battleVictimId = s.perm("battleVictim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: battleVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === effectVictimId));
    await advance(s.engine).finishAttack();

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("effectVictim").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([battleVictimId]);
  });
});
