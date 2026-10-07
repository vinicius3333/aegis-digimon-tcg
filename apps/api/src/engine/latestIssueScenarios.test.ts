import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import type { IssueReproScenarioId } from "./issueReproScenarios.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "./testkit/harness.js";

async function launch(id: IssueReproScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.engine.breeding.isOpen && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return {
    ...s,
    hand: (cardId: string) => s.state.players[0]!.hand.find((c) => c.cardId === cardId)!,
    field: (cardId: string) => s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === cardId)!,
    finish: async () => {
      expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  };
}

it("Tai & Matt arena explains the second activation without declaring a second attack", async () => {
  const s = await launch("arena-tai-matt-double-end-turn", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: true,
  });
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "attackDeclared"));
  await advance(s.engine).finishAttack();
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  const questions = s.decisions.filter(({ req }) => req.options?.selectionContext === "attackSource");
  expect(questions).toHaveLength(2);
  expect(questions[0]!.req.options?.promptKey).toBeUndefined();
  expect(questions[1]!.req.options?.promptKey).toBe("attackAlreadyResolving");
  expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
  expect(s.state.players[1]!.security).toHaveLength(2);
  expect(s.field("AD1-025").isSuspended).toBe(false);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  await s.finish();
});

it("#5254 playable arena offers zero-cost DNA from the EX13 level-five pair", async () => {
  const s = await launch("arena-issue-5254-examon-dna", { autoDeclineOptional: true });
  expect(s.hand("BT20-045").dnaDigivolveRoutes).toHaveLength(1);
  expect(
    s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      instanceId: s.hand("BT20-045").instanceId,
      materialPermanentIds: [s.field("EX13-041").permanentId, s.field("EX13-021").permanentId],
    }),
  ).toEqual({ ok: true });
  await settle(() => s.field("BT20-045") !== undefined && s.state.pendingDecision === undefined);
  expect(s.state.memory).toBe(3);
  expect(
    s
      .field("BT20-045")
      .stack.map((c) => c.cardId)
      .sort(),
  ).toEqual(["EX13-021", "EX13-041"]);
  await s.finish();
});

it("#5207 playable arena gains memory for a Guard sacrifice with granted Blocker", async () => {
  const s = await launch("arena-issue-5207-dorimon-guard", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    autoOrderTriggers: true,
  });
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.field("EX13-063").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
  const opened = s.events.find((e) => e.kind === "counterWindowOpened");
  if (opened?.kind !== "counterWindowOpened") throw new Error("No Counter window");
  const eligible = opened.eligibleCounters.find(
    (e) => e.instanceId === s.state.players[1]!.battleArea[0]!.topCard.instanceId,
  )!;
  expect(
    s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: eligible.instanceId,
      effectKey: eligible.effectKey,
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.field("EX13-063")).toBeDefined();
  expect(s.field("EX13-053")).toBeUndefined();
  expect(s.state.memory).toBe(4);
  expect(s.state.pendingDecision).toBeUndefined();
  await s.finish();
});

it("#5248 playable arena resolves both Dynasmon Security choices independently", async () => {
  const s = await launch("arena-issue-5248-dynasmon-security");
  const dpBefore = s.field("BT1-026").currentDP;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.field("BT1-010").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  for (const cardId of ["BT1-014", "BT1-026"]) {
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.field(cardId).permanentId] },
      }),
    ).toEqual({ ok: true });
  }
  await advance(s.engine).finishAttack();
  expect(observe(s.engine).keywordAmount(s.field("BT1-014"), "SecurityAttack")).toBe(-1);
  expect(s.field("BT1-026").currentDP).toBe(dpBefore - 3000);
  expect(s.state.pendingDecision).toBeUndefined();
  await s.finish();
});

it("#5246 playable arena preserves declined SaviorHuckmon effect for an attack", async () => {
  const options = {
    autoDeclineOptional: true,
    autoAcceptOptional: false,
    autoSelectCards: true,
    autoChooseOption: true,
    autoOrderTriggers: true,
  };
  const s = await launch("arena-issue-5246-savior-decline", options);
  const base = s.field("BT1-014");
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.hand("EX13-012").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      base.topCard.cardId === "EX13-012" && s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision,
  );
  expect(s.hand("ST12-13")).toBeDefined();
  options.autoDeclineOptional = false;
  options.autoAcceptOptional = true;
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: base.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  await settle(() => !!s.field("ST12-13") && !s.state.pendingDecision);
  expect(s.field("ST12-13")).toBeDefined();
  await s.finish();
});

it("#5241 playable arena charges Belphemon Sleep cost minus sacrificed Gizmon AT", async () => {
  const s = await launch("arena-issue-5241-kurata-sleep", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    autoOrderTriggers: true,
  });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.hand("BT13-088").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => !!s.field("BT13-088") && s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  expect(s.state.memory).toBe(5);
  expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT13-083")).toBe(true);
  await s.finish();
});

it("#5247 playable arena discounts Option use despite Chikurimon before deleting it", async () => {
  const s = await launch("arena-issue-5247-crimson-use-cost", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    autoOrderTriggers: true,
  });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.hand("BT8-097").instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.trash.some((c) => c.cardId === "BT8-097") &&
      s.engine.mainVerbContinuationsInFlight === 0 &&
      !s.state.pendingDecision,
  );
  expect(s.state.memory).toBe(2);
  expect(s.state.players[1]!.trash.some((c) => c.cardId === "ST13-08")).toBe(true);
  await s.finish();
});

it("#5258 playable arena lets a resolution-plan DNA be followed by declining the attack", async () => {
  const s = await launch("arena-issue-5258-plesiomon-optional-attack", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: false,
    declinePrompts: ["Attack with a Digimon"],
  });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.hand("EX8-021").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const req = s.state.pendingDecision!;
  const keys: string[] = JSON.parse(req.payloadJson).triggerKeys;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind: "orderTriggers", order: keys, optionalAnswers: { [keys[0]!]: true, [keys[1]!]: false } },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.field("EX8-029") !== undefined && !s.state.pendingDecision);
  expect(
    s.decisions.some(({ req }) => req.kind === "optional" && req.options?.selectionContext === "attackSource"),
  ).toBe(true);
  expect(s.events.some((e) => e.kind === "attackDeclared")).toBe(false);
  expect(s.state.players[1]!.security).toHaveLength(3);
  await s.finish();
});

it("#5259 playable arena excludes GulusGammamon from the Brothers Delay on BetelGammamon", async () => {
  const preferred: string[] = [];
  const s = await launch("arena-issue-5259-gammamon-exact-evolution", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: true,
    preferInstanceIds: preferred,
  });
  preferred.push(s.hand("BT21-010").instanceId, s.field("BT21-019").permanentId, s.hand("RB1-009").instanceId);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.hand("BT21-022").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () => s.field("RB1-009") !== undefined && !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.hand("EX10-042")).toBeDefined();
  expect(s.state.memory).toBe(3);
  expect(s.state.turnSeat).toBe(0);
  await s.finish();
});

it("#5261 arena shows the field-wide DP reduction, Sukamon's successful play and rule deletion", async () => {
  const s = await launch("arena-issue-5261-sukamon-field-reduction", {
    autoDeclineOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: true,
  });
  const base = s.field("BT25-017");
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.hand("BT25-018").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      base.topCard.cardId === "BT25-018" && !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(JSON.parse(s.state.players[1]!.fieldEffectsJson)).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "dp", value: -4000, sourceCardId: "BT25-018" })]),
  );
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.field("BT25-103").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.events.some((e) => e.kind === "cardPlayed" && e.cardId === "BT14-034")).toBe(true);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT14-034")).toBe(true);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(
    JSON.parse(s.state.players[1]!.fieldEffectsJson).some((effect: { kind: string }) => effect.kind === "dp"),
  ).toBe(false);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  await s.finish();
});

it("keeps two public field effects separate and expires both at the turn boundary", async () => {
  const s = await launch("arena-multiple-field-effects", {
    autoDeclineOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: true,
  });
  for (let index = 0; index < 2; index++) {
    const base = s.field("BT25-017");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: s.hand("BT25-018").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        base.topCard.cardId === "BT25-018" && !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0,
    );
  }
  expect(JSON.parse(s.state.players[1]!.fieldEffectsJson)).toEqual([
    expect.objectContaining({ kind: "dp", value: -4000, sourceCardId: "BT25-018" }),
    expect.objectContaining({ kind: "dp", value: -4000, sourceCardId: "BT25-018" }),
  ]);
  expect(s.state.players[1]!.battleArea).toHaveLength(4);
  expect(s.state.players[1]!.battleArea.filter((p) => p.currentDP > 0)).toHaveLength(3);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(JSON.parse(s.state.players[1]!.fieldEffectsJson)).toEqual([]);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  await s.finish();
});

it("shows the viewer's Blocker alongside an opposing field reduction with independent expiry", async () => {
  const s = await launch("arena-own-field-effects", {
    autoDeclineOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: true,
  });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.hand("BT22-052").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () => s.field("BT22-052") !== undefined && !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(JSON.parse(s.state.players[0]!.fieldEffectsJson)).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "keyword", value: "Blocker", sourceCardId: "BT22-052" })]),
  );
  const base = s.field("BT25-017");
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.hand("BT25-018").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      base.topCard.cardId === "BT25-018" && !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(JSON.parse(s.state.players[1]!.fieldEffectsJson)).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "dp", value: -8000 })]),
  );
  expect(s.state.players[0]!.battleArea.every((p) => p.keywords.includes("Blocker"))).toBe(true);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(JSON.parse(s.state.players[1]!.fieldEffectsJson)).toEqual([]);
  expect(JSON.parse(s.state.players[0]!.fieldEffectsJson)).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "keyword", value: "Blocker" })]),
  );
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  await s.finish();
});
