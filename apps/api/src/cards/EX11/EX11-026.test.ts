import { digivolutionRequirementsFor, EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "../BT16/BT16-033.js";
import "./EX11-048.js";

const cardId = "EX11-026";

describe("EX11-026 Pteromon", () => {
  it("suspends an own Digimon and grants an eligible ally +3000 DP", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-012", as: "ally", dp: 2000 }], hand: [{ card: "EX11-026", as: "pteromon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const ally = s.perm("ally");
    const initialDP = ally.currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ally.currentDP === initialDP + 3000, 600);
    expect(ally.isSuspended).toBe(true);
    expect(ally.currentDP).toBe(initialDP + 3000);
  });

  it("fires When Moving when Pteromon moves from breeding and buffs an Avian ally", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "source" },
          battleArea: [{ card: "EX8-074", as: "vortex", dp: 11000 }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("vortex").permanentId);
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("source").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("source").permanentId)).toBe(
      true,
    );
    expect(s.perm("vortex").isSuspended).toBe(true);
    expect(s.perm("vortex").currentDP).toBe(14000);
    assertNoLoudGap(s);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("encodes both entry timings, any-player suspension, exact trait groups, and inherited battle memory", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Pteromon",
      colors: ["Green"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      types: ["Bird Dragon", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controllerDefault: "any" } }, optional: true },
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "untilOpponentTurnEnd",
            condition: { kind: "lastSuspendedIsMine" },
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  { tokens: ["Avian", "Bird"], match: "traitContains" },
                  { tokens: ["Vortex Warriors"], match: "trait" },
                ],
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenBattleWon",
            sourceFilter: { isSelfRef: true },
            actions: [{ kind: "GainMemory", amount: 1 }],
          },
        ],
      }),
    );
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it("may suspend an opposing Digimon but then does not grant the conditional DP bonus", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-012", as: "bird", dp: 2000 }],
          hand: [{ card: cardId, as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
    expect(decision.options?.candidateInstanceIds).toContain(s.perm("opponent").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("opponent").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("bird").isSuspended).toBe(false);
    expect(s.perm("bird").currentDP).toBe(2000);
    assertNoLoudGap(s);
  });

  it("offers partial-trait and Vortex Warriors allies but never a non-matching trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-074", as: "vortex", dp: 11000 },
            { card: "BT1-009", as: "offTrait", dp: 3000 },
          ],
          hand: [{ card: cardId, as: "source" }],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspendDecision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("vortex").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const buffDecision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
    const candidates = buffDecision.options?.candidateInstanceIds ?? [];
    expect(candidates).toEqual(expect.arrayContaining([s.perm("source").permanentId, s.perm("vortex").permanentId]));
    expect(candidates).not.toContain(s.perm("offTrait").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: buffDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("vortex").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("vortex").isSuspended).toBe(true);
    expect(s.perm("vortex").currentDP).toBe(14000);
    expect(s.perm("offTrait").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("may decline suspension and leaves every Digimon unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-012", as: "bird", dp: 2000 },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("source"));
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("bird").isSuspended).toBe(false);
    expect(s.perm("bird").currentDP).toBe(2000);
    assertNoLoudGap(s);
  });

  it("gains memory only once per turn when its evolved host wins real battles", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId], dp: 20_000 }] },
      1: {
        battleArea: [
          { card: "BT1-012", as: "firstTarget", dp: 3_000, suspended: true },
          { card: "BT1-014", as: "secondTarget", dp: 4_000, suspended: true },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    s.state.turnCount = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("gains memory when its evolved host wins a battle against a Security Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [cardId], dp: 20_000 }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: { security: ["BT1-012"], deck: ["BT1-013", "BT1-014", "BT1-015"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("Q5820/Q5821 resolves Armor Purge before gaining memory for the battle win", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId], dp: 20_000 }] },
        1: {
          battleArea: [{ card: "BT16-033", as: "target", under: ["BT1-009"], suspended: true }],
          security: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-009");
    await settle(() => s.state.memory === 1);

    const preventedIndex = s.events.findIndex(
      (event) => event.kind === "deletionPrevented" && event.keyword === "Armor Purge",
    );
    const gainedIndex = s.events.findIndex((event) => event.kind === "memoryChanged" && event.reason === "gainMemory");
    expect(preventedIndex).toBeGreaterThanOrEqual(0);
    expect(gainedIndex).toBeGreaterThan(preventedIndex);
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("target").permanentId,
    );
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("resolves its battle-win gain alongside an inherited On Deletion trigger", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId], dp: 20_000 }] },
      1: {
        battleArea: [{ card: "BT1-012", as: "target", under: ["EX11-048"], dp: 3_000, suspended: true }],
        security: ["BT1-013"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    const gains = s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory");
    expect(gains).toHaveLength(2);
    expect(
      gains.map((event) => {
        const changed = event as unknown as { from: number; to: number };
        return { from: changed.from, to: changed.to };
      }),
    ).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 0 },
    ]);
    assertNoLoudGap(s);
  });

  it("resets the inherited battle-win once-per-turn effect on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [cardId], dp: 20_000 }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
      1: {
        battleArea: [{ card: "BT1-012", as: "firstTarget", dp: 3_000, suspended: true }],
        security: ["BT1-013", "BT1-014"],
        deck: ["BT1-015", "BT1-016", "BT1-017", "BT1-018", "BT1-019"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const beforeSecondAttack = s.state.memory;
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === beforeSecondAttack + 1);
    expect(s.state.memory).toBe(beforeSecondAttack + 1);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("digivolves only over a green level 2 by its ordinary route and has no colour-free alternate", () => {
    const valid = setupEngine({
      0: { battleArea: [{ card: "EX11-003", as: "level2" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("level2").permanentId,
        instanceId: valid.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });

    const offColour = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redLevel3" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      offColour.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: offColour.perm("redLevel3").permanentId,
        instanceId: offColour.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "level3" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("level3").permanentId,
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
