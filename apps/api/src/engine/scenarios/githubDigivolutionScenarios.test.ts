import { EffectTiming, Phase, type Seat } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { effectsOf } from "../effects/collect.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";

async function start(id: DevScenarioId, options: SetupEngineOptions = {}, moveBreeding = false) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoOrderCards: true, ...options });
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(
    s.engine.applyIntent(
      0,
      moveBreeding
        ? { type: "moveFromBreeding", permanentId: s.state.players[0]!.breeding!.permanentId }
        : { type: "endPhase" },
    ),
  ).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}
function hand(s: ReturnType<typeof setupEngine>, id: string) {
  return s.state.players[0]!.hand.find((c) => c.cardId === id)!;
}
function field(s: ReturnType<typeof setupEngine>, id: string, seat: Seat = 0) {
  return s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === id)!;
}
async function done(s: ReturnType<typeof setupEngine>) {
  await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
}

it("GitHub #5274 arena: Siriusmon offers only cost 3 from VB WereGarurumon", async () => {
  const run = await start("arena-github-5274-siriusmon-vb-cost", { autoDeclineOptional: true });
  const { s } = run;
  const source = hand(s, "EX12-018");
  expect(source.digivolveRoutes.length).toBeGreaterThan(0);
  expect(source.digivolveRoutes.every((r) => r.projectedCost === 3)).toBe(true);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "EX12-032").permanentId,
      instanceId: source.instanceId,
    }),
  ).toEqual({ ok: true });
  await done(s);
  expect(field(s, "EX12-018").stack.map((c) => c.cardId)).toEqual(["EX12-032"]);
  expect(s.state.memory).toBe(7);
  await finish(run);
});

it("GitHub #5273 arena: two physical copies of Ouryumon are offered and accepted for ordinary DNA", async () => {
  const run = await start("arena-github-5273-two-ouryumon-dna");
  const { s } = run;
  const [first, second] = s.state.players[0]!.battleArea;
  const source = hand(s, "BT20-060");
  const ids = [first!.permanentId, second!.permanentId];
  expect(source.dnaDigivolveRoutes).toHaveLength(1);
  expect(source.dnaDigivolveRoutes[0]!.projectedCost).toBe(0);
  expect(JSON.parse(source.dnaDigivolveRoutes[0]!.materialPermanentIdsJson)).toEqual(ids);
  expect(
    s.engine.applyIntent(0, { type: "dnaDigivolve", instanceId: source.instanceId, materialPermanentIds: ids }),
  ).toEqual({ ok: true });
  await done(s);
  expect(s.state.players[0]!.battleArea).toHaveLength(1);
  expect(field(s, "BT20-060").stack.map((c) => c.cardId)).toEqual(["BT20-018", "BT20-018"]);
  expect(s.state.players[1]!.security).toHaveLength(1);
  expect(s.state.players[0]!.security).toHaveLength(6);
  await finish(run);
});

it("GitHub #5272 arena: Kyubimon searches after moving through the real breeding phase", async () => {
  const run = await start("arena-github-5272-kyubimon-moving", {}, true);
  const { s } = run;
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "ST22-03") &&
      s.state.pendingDecision === undefined,
  );
  expect(hand(s, "ST22-02")).toBeDefined();
  expect(field(s, "ST22-03").inBreeding).toBe(false);
  expect(s.state.players[0]!.breeding).toBeUndefined();
  expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual([
    "BT1-009",
    "BT1-009",
    "BT1-009",
    "BT1-010",
    "BT1-011",
  ]);
  await finish(run);
});

it("GitHub #5269/#5272 arena: Kyubimon searches after battle-area digivolution", async () => {
  const run = await start("arena-github-5269-kyubimon-digivolving");
  const { s } = run;
  const before = s.state.players[0]!.hand.length;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "ST22-02").permanentId,
      instanceId: hand(s, "ST22-03").instanceId,
    }),
  ).toEqual({ ok: true });
  await done(s);
  expect(field(s, "ST22-03")).toBeDefined();
  expect(hand(s, "ST22-02")).toBeDefined();
  expect(s.state.players[0]!.hand).toHaveLength(before + 1);
  expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual([
    "BT1-009",
    "BT1-009",
    "BT1-009",
    "BT1-011",
    "BT1-012",
  ]);
  expect(
    s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "ST22-03" && e.timing === "WhenDigivolving"),
  ).toBe(true);
  await finish(run);
});

it.each([false, true])("GitHub #5268 arena: Blue Card legal exact Lucemon base %s", async (legal) => {
  const run = await start(legal ? "arena-github-5268-blue-card-lucemon" : "arena-github-5268-blue-card-chaos-mode", {
    autoAcceptOptional: true,
    declinePrompts: ["By trashing 1 card"],
  });
  const { s } = run;
  const base = field(s, legal ? "EX10-013" : "EX10-052");
  const baseInstanceId = base.topCard.instanceId;
  const revealed = s.state.players[0]!.deck[0]!;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "EX2-072").instanceId })).toEqual({
    ok: true,
  });
  await done(s);
  expect(base.topCard.instanceId).toBe(legal ? revealed.instanceId : baseInstanceId);
  expect(s.events.some((e) => e.kind === "digivolved")).toBe(legal);
  expect(s.state.memory).toBe(7);
  expect(base.stack.map((c) => c.cardId)).toEqual(legal ? ["EX10-013"] : []);
  expect(s.state.players[0]!.hand.some((c) => c.instanceId === revealed.instanceId)).toBe(!legal);
  await finish(run);
});

it.each([
  ["arena-github-5283-wargreymon-modal-warp", "BT22-013"],
  ["arena-github-5283-metalgarurumon-modal-warp", "BT22-026"],
] as const)("GitHub #5283 arena %s: the empty partner bullet is legal (Q2743/Q2773)", async (scenario, cardId) => {
  const run = await start(scenario, { autoDeclineOptional: true, autoChooseOption: true });
  const { s } = run;
  const source = hand(s, cardId);
  const sourceOf = (s.engine as unknown as { cardSourceOf(c: object): Parameters<typeof effectsOf>[1] }).cardSourceOf(
    source,
  );
  const effectKey = effectsOf(EffectTiming.OnDeclaration, sourceOf)[0]!.effectKey;
  expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual({
    ok: true,
  });
  await done(s);
  expect(field(s, cardId)).toBeDefined();
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
  const choice = s.decisions.find((d) => d.req.kind === "chooseOption" && d.req.sourceCardId === cardId);
  expect(choice?.req.options?.choices).toHaveLength(2);
  expect(
    s.events.some(
      (e) => e.kind === "effectOptionChosen" && e.sourceCardId === cardId && e.clause.includes("may digivolve"),
    ),
  ).toBe(true);
  await finish(run);
});

it.each([
  ["arena-github-5283-wargreymon-modal-warp", "BT22-013", "trash"],
  ["arena-github-5283-metalgarurumon-modal-warp", "BT22-026", "hand"],
] as const)("GitHub #5283 arena %s: choosing removal still resolves it", async (scenario, cardId, destination) => {
  const run = await start(scenario, { autoDeclineOptional: true, preferOptionIndex: 1 });
  const { s } = run;
  const source = hand(s, cardId);
  const victim = field(s, "BT1-010", 1).topCard.instanceId;
  const sourceOf = (s.engine as unknown as { cardSourceOf(c: object): Parameters<typeof effectsOf>[1] }).cardSourceOf(
    source,
  );
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: source.instanceId,
      effectKey: effectsOf(EffectTiming.OnDeclaration, sourceOf)[0]!.effectKey,
    }),
  ).toEqual({ ok: true });
  await done(s);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]![destination].some((c) => c.instanceId === victim)).toBe(true);
  await finish(run);
});

it("GitHub #5283 control: resolving starter WarGreymon's zero-target immunity cannot skip its deletion", async () => {
  const run = await start("arena-github-5283-wargreymon-mandatory-delete", { autoOrderTriggers: false });
  const { s } = run;
  const victim = field(s, "BT1-010", 1).topCard.instanceId;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "ST20-10").permanentId,
      instanceId: hand(s, "ST20-11").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const request = s.decisions.findLast((d) => d.req.kind === "orderTriggers")!.req;
  expect(request.options?.triggerKeys).toHaveLength(2);
  const index = request.options!.triggerDescriptions!.findIndex((d) => d.includes("don't affect"));
  expect(index).toBeGreaterThanOrEqual(0);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "orderTriggers", order: [request.options!.triggerKeys![index]!] },
    }),
  ).toEqual({ ok: true });
  await done(s);
  expect(s.state.players[1]!.trash.some((c) => c.instanceId === victim)).toBe(true);
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
  await finish(run);
});

it("GitHub #5289 arena: Ulforce X rejects itself while exact Ulforce remains cost 1", async () => {
  const run = await start("arena-github-5289-ulforce-exact-base", { autoSelectCards: true });
  const { s } = run;
  const source = hand(s, "BT12-029");
  const invalidBase = field(s, "BT12-029");
  const validBase = field(s, "BT11-032");
  expect(source.digivolveTargetPermanentIds).not.toContain(invalidBase.permanentId);
  expect(source.digivolveTargetPermanentIds).toContain(validBase.permanentId);
  expect(
    s.engine.applyIntent(0, { type: "digivolve", permanentId: invalidBase.permanentId, instanceId: source.instanceId }),
  ).toEqual({ ok: false, reason: "invalid-evolution" });
  expect(
    s.engine.applyIntent(0, { type: "digivolve", permanentId: validBase.permanentId, instanceId: source.instanceId }),
  ).toEqual({ ok: true });
  await done(s);
  expect(validBase.topCard.instanceId).toBe(source.instanceId);
  expect(validBase.isSuspended).toBe(false);
  expect(s.state.memory).toBe(9);
  await finish(run);
});

it("GitHub #5289 production arena: Rina does not offer X onto X after the first digivolution unsuspends", async () => {
  const run = await start("arena-github-5289-ulforce-rina", { autoAcceptOptional: true });
  const { s } = run;
  const base = field(s, "BT11-032");
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: base.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "attackEnded"));
  expect(base.isSuspended).toBe(true);
  const copies = s.state.players[0]!.hand.filter((c) => c.cardId === "BT12-029");
  const beforeMemory = s.state.memory;
  expect(
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: copies[0]!.instanceId }),
  ).toEqual({ ok: true });
  await done(s);
  expect(base.topCard.instanceId).toBe(copies[0]!.instanceId);
  expect(base.stack.map((c) => c.cardId)).toEqual(["BT11-032"]);
  expect(field(s, "EX13-069").isSuspended).toBe(true);
  expect(s.events.filter((e) => e.kind === "digivolved")).toHaveLength(1);
  expect(s.state.memory).toBe(beforeMemory - 1);
  expect(s.state.players[0]!.hand.some((c) => c.instanceId === copies[1]!.instanceId)).toBe(true);
  expect(
    s.decisions
      .filter((d) => d.req.sourceCardId === "EX13-069" && d.req.kind === "selectCards")
      .some((d) => d.req.options?.candidateInstanceIds?.includes(copies[1]!.instanceId)),
  ).toBe(false);
  await finish(run);
});
