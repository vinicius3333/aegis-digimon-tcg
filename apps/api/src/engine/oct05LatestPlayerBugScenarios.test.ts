import { EffectTiming, Phase, type Seat } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import type { IssueReproScenarioId } from "./issueReproScenarios.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "./testkit/harness.js";
async function start(id: IssueReproScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, ...options },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}
function hand(s: ReturnType<typeof setupEngine>, id: string, seat: Seat = 0) {
  return s.state.players[seat]!.hand.find((c) => c.cardId === id)!;
}
function field(s: ReturnType<typeof setupEngine>, id: string, seat: Seat = 0) {
  return s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === id)!;
}
async function main1(s: ReturnType<typeof setupEngine>) {
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
}
async function resolved(s: ReturnType<typeof setupEngine>, id: string) {
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === id) &&
      s.state.pendingDecision === undefined,
  );
}
it.each(["image", "breathing"] as const)(
  "#4995 %s Training arena keeps the discounted alternate cost at zero",
  async (kind) => {
    const id = kind === "image" ? "LM-056" : "LM-062";
    const run = await start(`arena-issue-4995-${kind}-training`, { preferOptionIndex: 1 });
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: field(s, id).topCard.instanceId,
        effectKey: `${id}/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => field(s, "BT25-082") !== undefined && !s.state.pendingDecision);
    expect(s.state.memory).toBe(5);
    await finish(run);
  },
);
it("#4995 Asuna arena offers BeelStarmon's alternate cost", async () => {
  const preferred: string[] = [];
  const run = await start("arena-issue-4995-asuna-evolution", {
    preferOptionIndex: 1,
    preferInstanceIds: preferred,
    declinePrompts: ["your hand", "Use an Option"],
  });
  const { s } = run;
  preferred.push(hand(s, "BT26-056").instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: field(s, "BT25-092").topCard.instanceId,
      effectKey: `BT25-092/ir-${EffectTiming.OnDeclaration}-0`,
    }),
  ).toEqual({ ok: true });
  await settle(() => field(s, "BT25-085") !== undefined && !s.state.pendingDecision);
  expect(s.state.memory).toBe(6);
  await finish(run);
});
it("#4995 Pagumon arena resolves the derived alternate digivolution", async () => {
  const preferred: string[] = [];
  const run = await start("arena-issue-4995-pagumon-evolution", {
    preferOptionIndex: 1,
    preferInstanceIds: preferred,
    declinePrompts: ["Use an Option", "Unsuspend"],
  });
  const { s } = run;
  preferred.push(s.state.players[0]!.trash.find((c) => c.cardId === "BT25-085")!.instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "BT25-082").permanentId,
      instanceId: hand(s, "BT25-083").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => field(s, "BT25-085") !== undefined && !s.state.pendingDecision);
  expect(s.state.memory).toBe(4);
  await finish(run);
});
it("#4993 Inferno Divide arena uses an Option from trash against protected Alphamon", async () => {
  const preferred: string[] = [];
  const run = await start("arena-issue-4993-inferno-divide-immunity", {
    preferInstanceIds: preferred,
    declinePrompts: ["Arts Digivolve"],
  });
  const { s } = run;
  const alpha = field(s, "EX13-060");
  preferred.push(alpha.permanentId, alpha.topCard.instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(s, "EX13-055").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(observe(s.engine).isRestrictedByEffect(alpha, "beAffected", "Digimon")).toBe(true);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await main1(s);

  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: field(s, "BT26-074", 1).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await resolved(s, "BT26-056");
  expect(alpha.topCard.cardId).toBe("EX13-049");
  await finish(run);
});
it("#4994 Fly Bullet arena deletes Ceresmon's protected Bacchusmon on the next turn", async () => {
  const preferred: string[] = [];
  const run = await start("arena-issue-4994-fly-bullet-immunity", {
    preferInstanceIds: preferred,
    declinePrompts: ["Suspend", "Ceresmon", "Bacchusmon", "digivolve", "Digivolve", "Unsuspend"],
  });
  const { s } = run;
  for (const id of ["BT25-077", "BT1-013"]) {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: field(s, id).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
  }
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT25-059").instanceId })).toEqual({
    ok: true,
  });
  await resolved(s, "BT25-059");
  expect(s.state.memory).toBe(6);
  const bacchus = field(s, "BT25-077");
  expect(observe(s.engine).isRestrictedByEffect(bacchus, "beAffected", "Digimon")).toBe(true);
  expect(observe(s.engine).isRestrictedByEffect(bacchus, "beAffected", "Option")).toBe(false);
  const ceres = field(s, "BT25-059");
  preferred.push(ceres.permanentId, ceres.topCard.instanceId);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT2-109").instanceId })).toEqual({
    ok: true,
  });
  await resolved(s, "BT2-109");
  expect(field(s, "BT25-059")).toBeUndefined();
  expect(field(s, "BT1-010", 1)).toBeUndefined();
  expect(s.state.memory).toBe(1);
  expect(observe(s.engine).isRestrictedByEffect(bacchus, "beAffected", "Digimon")).toBe(true);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await main1(s);
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: field(s, "BT25-085", 1).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "BT25-085" && e.timing === "OnUseOption",
      ) && !s.state.pendingDecision,
  );
  expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT25-077")).toBe(true);
  await finish(run);
});
it("#4996 HeavyMetaldramon arena plays into breeding without On Play", async () => {
  const run = await start("arena-issue-4996-heavy-metal-breeding", { preferOptionIndex: 1 });
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(s, "LM-068").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.breeding?.topCard.cardId === "BT11-079" && !s.state.pendingDecision);
  expect(
    s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT11-079" && e.timing === "OnPlay"),
  ).toBe(false);
  expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["LM-068"]);
  await finish(run);
});

it.each([
  ["arena-issue-4998-gammamon-breeding", "BT21-090", 5],
  ["arena-issue-4998-paradise-lost-breeding", "EX10-071", 6],
] as const)(
  "#4998 %s uses the field color waiver while the Digimon stays in breeding",
  async (scenario, cardId, expectedMemory) => {
    const run = await start(scenario);
    const { s } = run;
    const breeding = s.state.players[0]!.breeding!;
    const originalDP = breeding.currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, cardId).instanceId })).toEqual({ ok: true });
    await resolved(s, cardId);
    expect(s.state.memory).toBe(expectedMemory);
    expect(s.state.players[0]!.breeding?.permanentId).toBe(breeding.permanentId);
    expect(breeding.currentDP).toBe(originalDP);
    expect(field(s, cardId) !== undefined).toBe(cardId === "BT21-090");
    expect(s.state.players[0]!.trash.some((c) => c.cardId === cardId)).toBe(cardId === "EX10-071");
    await finish(run);
  },
);
