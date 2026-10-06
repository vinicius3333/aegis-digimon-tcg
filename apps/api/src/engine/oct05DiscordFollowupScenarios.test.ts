import { EffectTiming, Phase, type Intent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { buildBotView } from "../bot/view.js";
import { createIssueReproBotPolicy } from "./issueReproBotPolicy.js";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import type { IssueReproScenarioId } from "./issueReproScenarios.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "./testkit/harness.js";

function accept(s: ReturnType<typeof setupEngine>, intent: Intent) {
  expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
}

async function start(id: IssueReproScenarioId, options: SetupEngineOptions = {}) {
  const config = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, ...options };
  const s = setupEngine({ 0: {}, 1: {} }, config);
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop, config };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  if (s.state.phase === Phase.Breeding) {
    const seat = s.state.turnSeat;
    const ended = s.engine.applyIntent(seat, { type: "endPhase" });
    if (!ended.ok) throw new Error(`Could not close the reproduction's breeding phase: ${ended.reason}`);
    await advance(s.engine).waitForMainPhase(seat);
  }
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}
function field(s: ReturnType<typeof setupEngine>, id: string, seat = 0) {
  return s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === id)!;
}
function hand(s: ReturnType<typeof setupEngine>, id: string) {
  return s.state.players[0]!.hand.find((c) => c.cardId === id)!;
}
function activate(s: ReturnType<typeof setupEngine>, id: string) {
  const source = field(s, id);
  const effect = observe(s.engine)
    .activatableEffects(source)
    .find((e) => e.effectKey.startsWith(`${id}/`))!;
  expect(effect).toBeDefined();
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: source.topCard.instanceId,
      effectKey: effect.effectKey,
    }),
  ).toEqual({ ok: true });
}

it.each([true, false])("Examon BT23 Partition clearly previews both Oracle sources; accepted=%s", async (accepted) => {
  const id = "arena-examon-bt23-partition-choice";
  const run = await start(id);
  const { s } = run;
  try {
    accept(s, { type: "endPhase" });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    run.config.autoSelectCards = false;
    const policy = createIssueReproBotPolicy(id)!;
    expect(s.engine.applyIntent(1, policy.chooseMainAction(buildBotView(s.state, 1)!))).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 0 && s.state.pendingDecision.kind === "selectCards");
    const partition = s.decisions.at(-1)!.req;
    expect(partition.sourceCardId).toBe("BT23-047");
    expect(partition.options?.visibleCards?.map((card) => card.cardId).sort()).toEqual(["BT20-042", "EX13-021"]);
    expect(partition.options?.selectionContext).toBe("partitionActivation");
    run.config.autoSelectCards = true;
    run.config.autoAcceptOptional = false;
    Object.assign(run.config, { autoDeclineOptional: true });
    accept(s, {
      type: "respondDecision",
      decisionId: partition.decisionId,
      response: { kind: "selectCards", instanceIds: accepted ? partition.options!.candidateInstanceIds! : [] },
    });
    await settle(() => s.state.players[0]!.deck.some((card) => card.cardId === "BT23-047") && !s.state.pendingDecision);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard.cardId).sort()).toEqual(
      accepted ? ["BT20-042", "EX13-021"] : [],
    );
    expect(s.state.players[0]!.trash).toHaveLength(accepted ? 4 : 6);
  } finally {
    await finish(run);
  }
});

it("Discord 1556831312008974437: the bot applies Wingdramon's lock and Jesmon attacks after Gankoomon X immunity", async () => {
  const id = "arena-discord-1556831312008974437-jesmon-gankoomon-immunity";
  const run = await start(id);
  const { s } = run;
  try {
    accept(s, { type: "endPhase" });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const policy = createIssueReproBotPolicy(id)!;
    const botView = () => buildBotView(s.state, 1)!;
    expect(s.engine.applyIntent(1, policy.chooseMainAction(botView()))).toEqual({ ok: true });
    const jesmon = field(s, "BT23-013");
    await settle(() => observe(s.engine).isRestricted(jesmon, "suspend") && !s.state.pendingDecision);
    expect(field(s, "EX13-021", 1)).toBeDefined();
    expect(s.engine.applyIntent(1, policy.chooseMainAction(botView()))).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    accept(s, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: jesmon.permanentId, target: { kind: "player" } })
        .ok,
    ).toBe(false);
    run.config.autoOrderTriggers = false;
    accept(s, { type: "playCard", instanceId: hand(s, "BT20-057").instanceId });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const req = s.decisions.at(-1)!.req;
    expect(req.options?.triggerCardIds).toEqual(["BT20-057", "BT23-013"]);
    const order = req.options!.triggerKeys!;
    run.config.autoOrderTriggers = true;
    accept(s, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind: "orderTriggers", order, optionalAnswers: Object.fromEntries(order.map((key) => [key, true])) },
    });
    await settle(() => s.events.some((e) => e.kind === "attackDeclared"));
    expect(field(s, "BT20-059").stack.map((c) => c.cardId)).toEqual(["BT20-057"]);
    expect(observe(s.engine).isRestrictedByEffect(jesmon, "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestricted(jesmon, "suspend")).toBe(false);
    expect(jesmon.isSuspended).toBe(true);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(-5);
    await advance(s.engine).finishAttack();
    await settle(() => !s.state.pendingDecision);
    expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
  } finally {
    await finish(run);
  }
});

describe("Discord 1556821976922849360: Tsunomon discounts Jupitermon's variable cost", () => {
  it.each([
    ["arena-discord-1556821976922849360-tsunomon-jupitermon", 5],
    ["arena-discord-1556821976922849360-tsunomon-jupitermon-zero", 8],
  ] as const)("%s charges the discounted cost", async (id, memory) => {
    const run = await start(id);
    const { s } = run;
    const host = field(s, "P-213");
    accept(s, {
      type: "attack",
      attackerPermanentId: field(s, "BT24-022").permanentId,
      target: { kind: "player" },
    });
    await settle(() => host.topCard.cardId === "BT24-101");
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(memory);
    expect(host.stack.map((card) => card.cardId)).toEqual(["BT24-003", "P-194", "P-213"]);
    await finish(run);
  });
});

describe("Discord 1556772182607011971: reduced effect evolution chooses its requirement", () => {
  for (const [suffix, source, reduction, optionCost] of [
    ["asuna", "BT25-092", 1, 0],
    ["image-training", "LM-056", 2, 0],
    ["breathing-training", "LM-062", 2, 0],
    ["pagumon", "BT25-005", 2, 6],
  ] as const) {
    it.each([0, 1])(`${suffix} pays the selected route %s and its discount exactly once`, async (route) => {
      const preferred: string[] = [];
      const run = await start(`arena-discord-1556772182607011971-${suffix}`, {
        autoChooseOption: false,
        declinePrompts: ["Use an Option", "trashing 1 Option card", "Arts Digivolve"],
        preferInstanceIds: preferred,
      });
      const { s } = run;
      if (suffix === "pagumon") {
        preferred.push(s.state.players[0]!.trash.find((c) => c.cardId === "EX7-066")!.instanceId);
        accept(s, { type: "playCard", instanceId: hand(s, "BT25-085").instanceId, useAs: "option" });
      } else activate(s, source);
      await settle(() => s.state.pendingDecision?.kind === "chooseOption");
      const decision = s.decisions.at(-1)!.req;
      expect(decision.options).toMatchObject({
        choices: ["Printed digivolution requirement (cost 4)", "Alternate digivolution requirement (cost 3)"],
        digivolveCostChoice: { fromCardId: "BT25-083", intoCardId: "BT25-085", costs: [4, 3], costDelta: -reduction },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "chooseOption", optionIndex: route },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          field(s, "BT25-085") !== undefined &&
          s.state.pendingDecision === undefined &&
          s.events.some(
            (e) => (e.kind === "effectResolved" || e.kind === "effectActivated") && e.sourceCardId === source,
          ),
      );
      expect(s.state.memory).toBe(8 - optionCost - (4 - route - reduction));
      expect(
        s.events.some(
          (e) => (e.kind === "effectResolved" || e.kind === "effectActivated") && e.sourceCardId === source,
        ),
      ).toBe(true);
      expect(field(s, "BT25-092")?.isSuspended).toBe(suffix === "asuna" ? true : undefined);
      expect(field(s, source) === undefined).toBe(suffix !== "asuna");
      await finish(run);
    });
  }
});

describe("Discord 1556772689731915896: Fly Bullet is an Option effect", () => {
  it.each(["hand", "sources"] as const)("deletes Digimon-immune Gallantmon X when used from %s", async (origin) => {
    const run = await start(`arena-discord-1556772689731915896-fly-bullet-${origin}`, {
      declinePrompts: ["Place 1 card(s) under", "trashing 1 Option card", "Arts Digivolve"],
    });
    const { s } = run;
    expect(observe(s.engine).isRestrictedByEffect(field(s, "EX8-073", 1), "beAffected", "Digimon")).toBe(true);
    if (origin === "hand") {
      accept(s, { type: "playCard", instanceId: hand(s, "BT25-085").instanceId, useAs: "option" });
    } else {
      accept(s, { type: "attack", attackerPermanentId: field(s, "BT25-085").permanentId, target: { kind: "player" } });
      await advance(s.engine).finishAttack();
    }
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.events.some(
          (e) =>
            e.kind === "effectResolved" &&
            e.sourceCardId === "BT25-085" &&
            e.timing === EffectTiming[EffectTiming.OnUseOption],
        ),
    );
    expect(field(s, "EX8-073", 1)).toBeUndefined();
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "EX8-073")).toBe(true);
    expect(s.state.players[0]!.trash.filter((c) => c.cardId === "BT25-085")).toHaveLength(1);
    expect(s.state.memory).toBe(origin === "hand" ? 2 : 8);
    expect(observe(s.engine).resolvingEffectSourceKinds()).toBeUndefined();
    await finish(run);
  });
});

it("Discord 1556772689731915896: an ordinary Fly Bullet used by BT6 BeelStarmon is also an Option effect", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT6-112", as: "beel" }], trash: [{ card: "BT6-109", as: "bullet" }] },
      1: { battleArea: [{ card: "BT15-053", as: "immune", suspended: true }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(observe(s.engine).isRestrictedByEffect(s.perm("immune"), "beAffected", "Digimon")).toBe(true);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beel").instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.pendingDecision === undefined &&
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT6-112"),
  );
  expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).not.toContain("BT15-053");
  expect(s.state.players[0]!.trash.filter((c) => c.instanceId === s.inst("bullet").instanceId)).toHaveLength(1);
  expect(observe(s.engine).resolvingEffectSourceKinds()).toBeUndefined();
});

describe("Discord 1556782829713621082: other explicit on-field color waivers", () => {
  it.each([
    ["BT21-090", "LM-016"],
    ["EX10-071", "BT18-034"],
    ["P-205", "EX9-007"],
  ])("uses %s with its only matching Digimon %s in breeding", async (option, digimon) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: option, as: "option" }],
          breeding: { card: digimon, as: "source" },
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === option),
    );
    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(s.inst("source").instanceId);
  });
});

it("Discord 1556782829713621082: the arena uses DigiLab while Veemon stays in breeding", async () => {
  const run = await start("arena-discord-1556782829713621082-digilab-breeding");
  const { s } = run;
  const veemonId = s.state.players[0]!.breeding!.topCard.instanceId;
  const initialHand = s.state.players[0]!.hand.length;
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "P-225").instanceId })).toEqual({ ok: true });
  await settle(() => field(s, "P-225") !== undefined && s.state.pendingDecision === undefined);
  expect(s.state.memory).toBe(3);
  expect(s.state.players[0]!.hand).toHaveLength(initialHand);
  expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(veemonId);
  await finish(run);
});

it("Discord 1556798361435373630: the arena retires Mococomon after nested attack evolution and De-Digivolve", async () => {
  const preferred: string[] = [];
  const run = await start("arena-discord-1556798361435373630-mococomon-once-per-turn", {
    autoOrderTriggers: false,
    declineDigiXros: true,
    preferInstanceIds: preferred,
    preferTriggerKeys: ["EX12-056"],
  });
  const { s } = run;
  const host = field(s, "EX12-043");
  const sanzomon = hand(s, "EX12-045");
  const cho = hand(s, "EX12-056");
  const erlangs = s.state.players[0]!.hand.filter((c) => c.cardId === "EX12-034");
  preferred.push(cho.instanceId, field(s, "BT24-101", 1).topCard.instanceId, sanzomon.instanceId);
  accept(s, { type: "digivolve", permanentId: host.permanentId, instanceId: sanzomon.instanceId });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const initial = s.decisions.at(-1)!.req;
  expect(initial.options?.triggerCardIds).toEqual(["EX12-056", "EX12-002"]);
  const order = initial.options!.triggerKeys!;
  preferred.unshift(erlangs[0]!.instanceId);
  run.config.autoOrderTriggers = true;
  accept(s, {
    type: "respondDecision",
    decisionId: initial.decisionId,
    response: {
      kind: "orderTriggers",
      order,
      optionalAnswers: Object.fromEntries(order.map((key) => [key, true])),
    },
  });
  await settle(() => s.events.some((e) => e.kind === "attackDeclared"));
  await advance(s.engine).finishAttack();
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-056") &&
      s.state.pendingDecision === undefined,
  );
  expect(host.topCard.cardId).toBe("EX12-045");
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(erlangs[1]!.instanceId);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(erlangs[0]!.instanceId);
  expect(s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-002")).toHaveLength(1);
  expect(s.state.memory).toBe(1);
  await finish(run);
});

describe("Discord 1556811259867955282: Patamon security inspection", () => {
  it.each(["zero", "one", "multiple"] as const)(
    "%s targets: one private search offers optional evolution",
    async (suffix) => {
      const run = await start(`arena-discord-1556811259867955282-patamon-${suffix}`, {
        autoSelectCards: false,
        autoAcceptOptional: false,
      });
      const { s } = run;
      const inspection = s.decisions.at(-1)!.req;
      expect(inspection.kind).toBe("selectCards");
      const targets = suffix === "zero" ? 0 : suffix === "one" ? 1 : 2;
      expect(inspection.options).toMatchObject({ min: 0, max: Math.min(1, targets) });
      expect(inspection.options?.candidateInstanceIds).toHaveLength(targets);
      expect(inspection.options?.visibleCards).toHaveLength(3);
      expect(s.state.players[0]!.security.every((c) => !c.faceUp)).toBe(true);
      accept(s, {
        type: "respondDecision",
        decisionId: inspection.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT14-033")).toHaveLength(1);
      expect(field(s, "BT14-033")).toBeDefined();
      expect(s.state.players[0]!.security).toHaveLength(3);
      expect(s.state.players[0]!.security.every((c) => !c.faceUp)).toBe(true);
      await finish(run);
    },
  );
});

it("Discord 1556810241952194590: the bot's Inferno Divide strips naturally protected EX13 Alphamon", async () => {
  const run = await start("arena-discord-1556810241952194590-cerberusmon-alphamon", {
    autoChooseOption: false,
    declinePrompts: ["Barrier", "Arts Digivolve", "trashing your top security"],
  });
  const { s } = run;
  const protectedId = field(s, "EX13-055").permanentId;
  accept(s, { type: "attack", attackerPermanentId: protectedId, target: { kind: "player" } });
  for (const costs of [
    [4, 3],
    [5, 4],
  ]) {
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    expect(s.decisions.at(-1)!.req.options?.digivolveCostChoice?.costs).toEqual(costs);
    accept(s, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "chooseOption", optionIndex: 1 },
    });
  }
  run.config.autoChooseOption = true;
  await advance(s.engine).finishAttack();
  await settle(() => field(s, "EX13-060") !== undefined && s.state.pendingDecision === undefined);
  expect(observe(s.engine).isRestrictedByEffect(protectedId, "beAffected", "Digimon")).toBe(true);
  expect(observe(s.engine).isRestrictedByEffect(protectedId, "beAffected", "Option")).toBe(false);
  accept(s, { type: "endPhase" });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  const policy = createIssueReproBotPolicy("arena-discord-1556810241952194590-cerberusmon-alphamon")!;
  const intent = policy.chooseMainAction(buildBotView(s.state, 1)!);
  expect(intent).toMatchObject({
    type: "playCard",
    useAs: "option",
    instanceId: s.state.players[1]!.hand.find((c) => c.cardId === "BT26-056")!.instanceId,
  });
  expect(s.engine.applyIntent(1, intent)).toEqual({ ok: true });
  await settle(() => field(s, "EX13-049") !== undefined && s.state.pendingDecision === undefined);
  expect(field(s, "EX13-049").stack.map((c) => c.cardId)).toEqual([]);
  expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(
    expect.arrayContaining(["EX13-060", "EX13-057", "EX13-055"]),
  );
  expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT26-056")).toBe(true);
  expect(observe(s.engine).resolvingEffectSourceKinds()).toBeUndefined();
  await finish(run);
});
