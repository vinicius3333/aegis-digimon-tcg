import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { makeDigimon, makeInstance, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-011.js";
import "../BT12/BT12-013.js";
import "./EX3-043.js";
import "./EX3-052.js";
import "./EX3-053.js";
import "./EX3-065.js";

interface DecisionPayload {
  candidateInstanceIds?: string[];
  min?: number;
  max?: number;
  timing?: string;
  effectText?: string;
}

function payload(decision: { payloadJson: string }): DecisionPayload {
  return JSON.parse(decision.payloadJson) as DecisionPayload;
}

describe("EX3-053 Metallicdramon", () => {
  it("has the official metadata and evolves from either a black or red level 5 for 4", () => {
    expect(getCardDefinition("EX3-053")).toMatchObject({
      cardId: "EX3-053",
      nameEn: "Metallicdramon",
      colors: ["Black"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Sky Dragon"],
      rarity: "SR",
    });
  });

  it("On Play De-Digivolves every opposing stack, then deletes exactly 1 resulting cost-5 Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-053", as: "metallicdramon" }] },
      1: {
        battleArea: [
          { card: "EX3-053", under: ["EX3-049"], as: "firstEligible" },
          { card: "EX3-053", under: ["EX3-049"], as: "secondEligible" },
          { card: "EX3-053", under: ["EX3-050"], as: "tooExpensive" },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metallicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.perm("firstEligible").topCard.cardId).toBe("EX3-049");
    expect(s.perm("secondEligible").topCard.cardId).toBe("EX3-049");
    expect(s.perm("tooExpensive").topCard.cardId).toBe("EX3-050");
    const decision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-053",
      options: { timing: "OnPlay", min: 1, max: 1 },
    });
    expect(payload(decision).candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("firstEligible").permanentId, s.perm("secondEligible").permanentId]),
    );
    expect(payload(decision).candidateInstanceIds).not.toContain(s.perm("tooExpensive").permanentId);
    expect(payload(decision).effectText).toContain("De-Digivolve 1");

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstEligible").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([s.perm("secondEligible").permanentId, s.perm("tooExpensive").permanentId]),
    );
  });

  it("does not install the digivolution lock when its Delete action succeeds", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-053", as: "metallicdramon" }] },
      1: {
        battleArea: [
          { card: "EX3-053", under: ["EX3-049"], as: "deletionTarget" },
          { card: "EX3-050", as: "evolutionBase" },
        ],
        hand: [{ card: "EX3-053", as: "evolver" }],
        deck: ["BT1-011"],
      },
    });
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metallicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    s.state.turnSeat = 1;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("evolutionBase").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
  });

  it("Q3420 blocks DNA digivolution with one unsuspended material and allows two suspended materials", async () => {
    const blocked = setupEngine({
      0: { hand: [{ card: "EX3-053", as: "metallicdramon" }] },
      1: {},
    });
    blocked.state.memory = 12;
    await blocked.ready();
    expect(
      blocked.engine.applyIntent(0, {
        type: "playCard",
        instanceId: blocked.inst("metallicdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    const unsuspendedBlue = makeDigimon(1, 5000, "AD1-010");
    const suspendedGreen = makeDigimon(1, 4000, "BT1-069");
    suspendedGreen.isSuspended = true;
    const blockedDna = makeInstance("ST9-05", 1, false);
    blocked.state.players[1]!.battleArea.push(unsuspendedBlue, suspendedGreen);
    blocked.state.players[1]!.hand.push(blockedDna);
    blocked.state.turnSeat = 1;
    blocked.state.phase = Phase.Main;
    expect(
      blocked.engine.applyIntent(1, {
        type: "dnaDigivolve",
        materialPermanentIds: [unsuspendedBlue.permanentId, suspendedGreen.permanentId],
        instanceId: blockedDna.instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    unsuspendedBlue.isSuspended = true;
    expect(
      blocked.engine.applyIntent(1, {
        type: "dnaDigivolve",
        materialPermanentIds: [unsuspendedBlue.permanentId, suspendedGreen.permanentId],
        instanceId: blockedDna.instanceId,
      }),
    ).toEqual({ ok: true });
  });

  it("blocks an unsuspended Digimon but allows a suspended Digimon to digivolve", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-053", as: "metallicdramon" }] },
      1: {
        battleArea: [
          { card: "EX3-050", as: "unsuspendedBase" },
          { card: "EX3-050", suspended: true, as: "suspendedBase" },
        ],
        hand: [
          { card: "EX3-053", as: "blockedEvolver" },
          { card: "EX3-053", as: "allowedEvolver" },
        ],
        deck: ["BT1-011"],
      },
    });
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metallicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    s.state.turnSeat = 1;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("unsuspendedBase").permanentId,
        instanceId: s.inst("blockedEvolver").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("suspendedBase").permanentId,
        instanceId: s.inst("allowedEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
  });

  it("Q3421 checks the lock before Digisorption can suspend the evolution base", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX3-053", as: "metallicdramon" }] },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metallicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    const unsuspendedBase = makeDigimon(1, 6000, "BT1-072");
    const entmon = makeInstance("EX3-043", 1, false);
    s.state.players[1]!.battleArea.push(unsuspendedBase);
    s.state.players[1]!.hand.push(entmon);
    s.state.turnSeat = 1;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: unsuspendedBase.permanentId,
        instanceId: entmon.instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(unsuspendedBase.isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-043")).toHaveLength(0);
  });

  it("Q3422 blocks a Tamer used as if it were a Digimon but allows a direct named-Tamer requirement", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-053", as: "metallicdramon" }] },
      1: {
        battleArea: [
          { card: "BT12-088", as: "asIfTamer" },
          { card: "BT12-088", as: "namedTamer" },
        ],
        hand: [
          { card: "BT4-011", as: "asIfHybrid" },
          { card: "BT12-013", as: "namedHybrid" },
        ],
        deck: ["BT1-011"],
      },
    });
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metallicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    s.state.turnSeat = 1;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("asIfTamer").permanentId,
        instanceId: s.inst("asIfHybrid").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("namedTamer").permanentId,
        instanceId: s.inst("namedHybrid").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
  });

  it("the lock expires at the end of the opponent's turn", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-053", as: "metallicdramon" }] },
      1: {
        battleArea: [{ card: "EX3-050", as: "base" }],
        hand: [{ card: "EX3-053", as: "evolver" }],
        deck: ["BT1-011"],
      },
    });
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metallicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
  });

  it("with Hina on the opponent's turn, gains Blocker and Reboot, blocks, survives, and reboots", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-053", as: "metallicdramon" },
          { card: "EX3-065", as: "hina" },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("metallicdramon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("metallicdramon"), "Reboot")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("metallicdramon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("metallicdramon").isSuspended);
    await settle();

    expect(s.state.players[0]!.battleArea).toContain(s.perm("metallicdramon"));
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("metallicdramon"), "Reboot")).toBe(true);
    await (s.engine as unknown as { unsuspendForActivePhase(seat: 0 | 1): Promise<string[]> }).unsuspendForActivePhase(
      1,
    );
    expect(s.perm("metallicdramon").isSuspended).toBe(false);
  });

  it("has neither Blocker nor Reboot on its own turn or without a Tamer", async () => {
    const ownTurn = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-053", as: "metallicdramon" },
          { card: "EX3-065", as: "hina" },
        ],
      },
    });
    await ownTurn.ready();
    expect(observe(ownTurn.engine).hasKeyword(ownTurn.perm("metallicdramon"), "Blocker")).toBe(false);
    expect(observe(ownTurn.engine).hasKeyword(ownTurn.perm("metallicdramon"), "Reboot")).toBe(false);

    const noTamer = setupEngine({ 0: { battleArea: [{ card: "EX3-053", as: "metallicdramon" }] } });
    noTamer.state.turnSeat = 1;
    await noTamer.ready();
    expect(observe(noTamer.engine).hasKeyword(noTamer.perm("metallicdramon"), "Blocker")).toBe(false);
    expect(observe(noTamer.engine).hasKeyword(noTamer.perm("metallicdramon"), "Reboot")).toBe(false);
  });

  it("Sky Dragon family: Hina reactivates Metallicdramon's On Play after digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-052", as: "base" },
            { card: "EX3-065", as: "hina" },
          ],
          hand: [{ card: "EX3-053", as: "metallicdramon" }],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "EX3-053", under: ["EX3-049"], as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metallicdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.perm("hina").isSuspended);

    expect(s.perm("base").topCard.cardId).toBe("EX3-053");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("hina").isSuspended).toBe(true);
  });
});
