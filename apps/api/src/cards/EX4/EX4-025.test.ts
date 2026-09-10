import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-025.js";
import "../ST18/ST18-07.js";
import "../index.js";

describe("EX4-025 Turuiemon", () => {
  it("registers its official identity, Alliance, and alternate name evolution", () => {
    expect(getCardDefinition("EX4-025")).toMatchObject({
      cardId: "EX4-025",
      nameEn: "Turuiemon",
      colors: ["Yellow", "Green"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Green", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Beastkin"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Alliance", raw: "＜Alliance＞" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Lopmon", "Terriermon"], cost: 2, isAlternate: true },
    ]);
    expect(runtimeCompiledCard("EX4-025")).toMatchObject({ coverage: "full", residual: [] });
  });

  it.each([
    ["yellow", "EX4-023"],
    ["green", "EX4-032"],
  ])("digivolves from a %s level-3 Digimon for 3", async (_color, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-025", as: "turuiemon" }],
        deck: ["BT1-009", "BT1-013"],
      },
      1: { deck: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("turuiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-025");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCard]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it.each([
    ["Lopmon", "EX4-034"],
    ["Terriermon", "EX4-032"],
  ])("digivolves from level-3 %s in name for 2", async (_name, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-025", as: "turuiemon" }],
        deck: ["BT1-009", "BT1-013"],
      },
      1: { deck: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("turuiemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-025");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCard]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("rejects a level-3 source without Lopmon/Terriermon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "invalidSource" }],
        hand: [{ card: "EX4-025", as: "turuiemon" }],
        deck: ["BT1-013"],
      },
      1: { deck: ["BT1-013"] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("turuiemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-025");
  });

  it("resolves Alliance through the real combat decision window", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        battleArea: [
          { card: "EX4-025", as: "attacker", dp: 4000 },
          { card: "BT1-010", as: "ally", dp: 3000 },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "defender", dp: 7000, suspended: true },
          { card: "ST18-07", as: "blocker", dp: 7000 },
        ],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (
      s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean; hasOpenBlockWindow: boolean } }
    ).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    const prompt = s.events.find((event) => event.kind === "alliancePrompt") as
      | { eligibleAllyIds: string[] }
      | undefined;
    expect(prompt?.eligibleAllyIds).toEqual([s.perm("ally").permanentId]);
    expect(prompt?.eligibleAllyIds).not.toContain(s.perm("attacker").permanentId);
    expect(prompt?.eligibleAllyIds).not.toContain(s.perm("defender").permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended && combat.hasOpenBlockWindow);

    expect(s.perm("attacker").currentDP).toBe(7000);
    expect(s.perm("attacker").securityAttack).toBe(2);
  });

  it("allows Alliance to be declined without suspending the ally", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        battleArea: [
          { card: "EX4-025", as: "attacker", dp: 4000 },
          { card: "BT1-010", as: "ally", dp: 3000 },
        ],
      },
      1: { security: ["BT1-090", "BT1-090"] },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(4000);
  });

  it("reduces an opposing Digimon by 2000 after an attack when another own Digimon is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              excludeSelf: true,
              suspended: true,
              kind: ["Digimon"],
            },
          },
        },
      ],
    });
  });

  it("requires another suspended Digimon, excluding the inherited-effect source", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfAttack");
    expect(effect?.actions?.[0]).toMatchObject({
      condition: {
        kind: "youHave",
        filter: { excludeSelf: true, suspended: true, controllerDefault: "mine" },
      },
    });
  });

  it("applies the inherited DP loss through a real attack with another suspended ally", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-075", as: "host", under: ["EX4-025"], dp: 12000 },
          { card: "BT1-010", as: "suspendedAlly", suspended: true },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-019", as: "target", dp: 6000, suspended: true },
          { card: "BT1-019", as: "victim", dp: 6000 },
        ],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.perm("victim").currentDP === 4000);

    expect(s.perm("victim").currentDP).toBe(4000);
  });

  it("does not apply the inherited DP loss without another suspended ally", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", under: ["EX4-025"], dp: 12000 }] },
      1: {
        battleArea: [
          { card: "BT1-019", as: "target", dp: 6000, suspended: true },
          { card: "BT1-019", as: "victim", dp: 6000 },
        ],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.perm("victim").currentDP === 6000);

    expect(s.perm("victim").currentDP).toBe(6000);
  });

  it("limits the inherited DP loss to once per turn across two real attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-075", as: "host", under: ["EX4-025"], dp: 12000 },
            { card: "BT1-010", as: "suspendedAlly", suspended: true },
          ],
          hand: [{ card: "BT4-108", as: "unsuspendOption" }],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "first", dp: 6000, suspended: true },
            { card: "BT1-019", as: "second", dp: 6000, suspended: true },
            { card: "BT1-019", as: "firstVictim", dp: 6000 },
            { card: "BT1-019", as: "secondVictim", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").currentDP === 4000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspendOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.perm("firstVictim").currentDP === 6000);

    expect([s.perm("firstVictim").currentDP, s.perm("secondVictim").currentDP]).toEqual([6000, 6000]);
  });

  it("resets the inherited allowance on the next own turn through public play and attack flows", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-075", as: "host", under: ["EX4-025"], dp: 12000 },
            { card: "BT1-010", as: "suspendedAlly", suspended: true },
            { card: "BT1-010", as: "activeAlly", dp: 12000 },
            { card: "BT1-089", as: "mimi" },
          ],
          hand: [{ card: "BT14-096", as: "lockOption" }],
        },
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-090", "BT1-090"],
          battleArea: [
            { card: "BT1-019", as: "first", dp: 6000, suspended: true },
            { card: "BT1-019", as: "second", dp: 6000 },
            { card: "BT1-019", as: "victim", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.perm("second").currentDP === 4000);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("activeAlly").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("activeAlly").isSuspended);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lockOption").instanceId })).toEqual({
      ok: true,
    });
    await settleAcrossTimers(() => s.perm("second").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("victim").currentDP === 4000);
    expect(s.perm("victim").currentDP).toBe(4000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
