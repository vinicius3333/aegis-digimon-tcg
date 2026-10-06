import { EffectTiming, Phase, type CardInstance } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "./testkit/harness.js";
import { effectsOf } from "./effects/collect.js";
import type { CardSource } from "./effects/CardSource.js";

async function launch(id: DevScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
  const field = (slot: string, seat: 0 | 1 = 0) =>
    s.state.players[seat]!.battleArea.find((p) => p.permanentId === `oct06-latest-${slot}`)!;
  const attack = (slot: string) =>
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: field(slot).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  const finish = async () => {
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  return { s, field, attack, finish };
}
it.each([
  ["arena-oct06-sukamon-bt11-deletion-search", "BT11-040", "hand"],
  ["arena-oct06-sukamon-bt3-deletion-search", "BT3-063", "play"],
  ["arena-oct06-sukamon-ex13-deletion-search", "EX13-028", "play"],
] as const)(
  "Sukamon deletion arena %s: select a revealed card and resolve its printed destination",
  async (id, source, to) => {
    const { s, field, finish } = await launch(id, { autoAcceptOptional: true, autoOrderCards: true });
    const sourceId = field("sukamon").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: field("sukamon").permanentId,
        target: { kind: "permanent", permanentId: field("target", 1).permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const request = s.decisions.at(-1)!.req;
    expect(request.sourceCardId).toBe(source);
    expect(request.options?.visibleCards?.map((card) => card.instanceId)).toEqual([
      "oct06-latest-sukamon-reveal-1",
      "oct06-latest-sukamon-reveal-2",
      "oct06-latest-sukamon-reveal-3",
    ]);
    expect(request.options?.candidateInstanceIds).toEqual([
      "oct06-latest-sukamon-reveal-1",
      "oct06-latest-sukamon-reveal-2",
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: ["oct06-latest-sukamon-reveal-1"] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    const player = s.state.players[0]!;
    expect(player.battleArea.some((p) => p.permanentId === "oct06-latest-sukamon")).toBe(false);
    expect(player.trash.map((c) => c.instanceId)).toContain(sourceId);
    const chosenDestination =
      to === "hand" ? player.hand.map((c) => c.instanceId) : player.battleArea.map((p) => p.topCard.instanceId);
    expect(chosenDestination).toContain("oct06-latest-sukamon-reveal-1");
    const remainder = ["oct06-latest-sukamon-reveal-2", "oct06-latest-sukamon-reveal-3"];
    const remainderDestination = source === "BT3-063" ? player.deck.slice(-2) : player.trash;
    expect(remainderDestination.map((c) => c.instanceId)).toEqual(expect.arrayContaining(remainder));
    expect(s.state.memory).toBe(10);
    await finish();
  },
);
it.each(["purple-digimon", "purple-option"])(
  "Discord 1557062221719142481 arena: Matt recovers the selected %s from trash",
  async (slot) => {
    const { s, finish } = await launch("arena-oct06-trash-recovery");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "oct06-latest-matt" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.candidateInstanceIds).toEqual([
      "oct06-latest-purple-digimon",
      "oct06-latest-purple-option",
    ]);
    const selected = `oct06-latest-${slot}`;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [selected] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(selected);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(selected);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain("oct06-latest-illegal-red");
    await finish();
  },
);
it("Discord 1557059213266522233 arena: Davis selects revealed blue and green cards into hand", async () => {
  const { s, finish } = await launch("arena-oct06-revealed-search", { autoOrderCards: true });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "oct06-latest-davis" })).toEqual({ ok: true });
  let previous = "";
  for (const index of [1, 2]) {
    await settle(
      () => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.decisionId !== previous,
    );
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.visibleCards).toEqual([
      { instanceId: "oct06-latest-reveal-1", cardId: "BT1-027" },
      { instanceId: "oct06-latest-reveal-2", cardId: "BT1-064" },
      { instanceId: "oct06-latest-reveal-3", cardId: "BT1-010" },
    ]);
    expect(request.options?.candidateInstanceIds).toEqual([`oct06-latest-reveal-${index}`]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [`oct06-latest-reveal-${index}`] },
      }),
    ).toEqual({ ok: true });
    previous = request.decisionId;
  }
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual(
    expect.arrayContaining(["oct06-latest-reveal-1", "oct06-latest-reveal-2"]),
  );
  expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe("oct06-latest-reveal-3");
  await finish();
});
it("Discord 1557044001453113455 arena: Mastemon excludes Tamers and preserves the security owner's seat", async () => {
  const preferred = ["oct06-latest-target"];
  const { s, field, attack, finish } = await launch("arena-oct06-mastemon-owner-security", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: preferred,
  });
  const target = field("target", 1).topCard.instanceId;
  attack("mastemon");
  await advance(s.engine).finishAttack();
  expect(s.state.players[1]!.security.at(-1)?.instanceId).toBe(target);
  expect(s.state.players[0]!.security.map((c) => c.instanceId)).not.toContain(target);
  const choices = s.decisions.filter(({ req }) => req.kind === "chooseTargets" && req.sourceCardId === "BT23-102");
  expect(choices).toHaveLength(1);
  for (const { req } of choices) {
    expect(req.options?.candidateInstanceIds).not.toContain("oct06-latest-own-tamer");
    expect(req.options?.candidateInstanceIds).not.toContain("oct06-latest-opponent-tamer");
  }
  await finish();
});
it("Discord 1557051530291585105 arena: Kyo's effect-removal clause applies after Barrier", async () => {
  const { s, field, attack, finish } = await launch("arena-oct06-kyo-barrier", {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  attack("aegiomon");
  await settle(() => s.events.some((e) => e.kind === "barrierPrompt"));
  expect(
    s.engine.applyIntent(0, { type: "respondBarrier", permanentId: field("aegiomon").permanentId, accept: true }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(field("kyo").isSuspended).toBe(true);
  expect(field("kyo").stack).toHaveLength(1);
  expect(observe(s.engine).keywordAmount(field("target", 1), "SecurityAttack")).toBe(-1);
  await finish();
});
it("Discord 1557034399055216700 arena: DNA return asks the activating player for deck-top order", async () => {
  const { s, field, finish } = await launch("arena-oct06-millennium-deck-order", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoOrderCards: false,
  });
  const before = s.state.memory;
  expect(
    s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      instanceId: "oct06-latest-millennium",
      materialPermanentIds: [field("kimera").permanentId, field("machine").permanentId],
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderCards");
  expect(s.state.pendingDecision?.seat).toBe(0);
  const order = ["oct06-latest-five", "oct06-latest-three", "oct06-latest-four"];
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "orderCards", order },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[1]!.deck.slice(0, 3).map((c) => c.instanceId)).toEqual(order);
  expect(s.state.memory).toBe(before + 3);
  await finish();
});
it("Discord 1557040872820842556 arena: timeout cannot overtake Kazemon's accepted Blast resolution", async () => {
  const { s, field, attack, finish } = await launch("arena-oct06-kazemon-blast", {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  const takuya = field("aldamon").stack.find((c) => c.cardId === "BT12-088")!.instanceId;
  const aldamon = field("aldamon").topCard.instanceId;
  attack("aldamon");
  await settle(() => s.engine.combat.hasOpenCounterWindow);
  const window = s.events.find((e) => e.kind === "counterWindowOpened");
  if (window?.kind !== "counterWindowOpened") throw new Error("No Counter window");
  const counter = window.eligibleCounters.find((c) => c.instanceId === "oct06-latest-zephagamon")!;
  expect(
    s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: counter.instanceId,
      effectKey: counter.effectKey,
    }),
  ).toEqual({ ok: true });
  expect(s.engine.expireCombatWindow()).toBe(false);
  await settle(() => s.events.some((e) => e.kind === "effectActivated" && e.sourceCardId === "BT20-101"));
  await advance(s.engine).finishAttack();
  expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(takuya);
  expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toContain(aldamon);
  await finish();
});
it("Discord 1557032910413107332 arena: Assembly's Giromon source trashes security before self-deletion", async () => {
  const { s, finish } = await launch("arena-oct06-giromon-assembly", {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: "oct06-latest-millennium",
      assembly: { materialInstanceIds: ["oct06-latest-three", "oct06-latest-four", "oct06-latest-five"] },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.trash.some((c) => c.instanceId === "oct06-latest-millennium") &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.players[1]!.security).toHaveLength(2);
  await finish();
});
it("Discord 1557017861220737085 arena: Asuna evolves into Jupitermon for zero with one security", async () => {
  const options: SetupEngineOptions = {
    autoDeclineOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    preferOptionIndex: 1,
    preferInstanceIds: ["oct06-latest-option", "oct06-latest-aegiochus", "oct06-latest-jupiter"],
  };
  const { s, field, finish } = await launch("arena-oct06-asuna-jupiter", options);
  options.autoDeclineOptional = false;
  options.autoAcceptOptional = true;
  const before = s.state.memory;
  const source = (s.engine as unknown as { cardSourceOf: (c: CardInstance) => CardSource }).cardSourceOf(
    field("asuna").topCard,
  );
  const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((e) =>
    e.effectKey.startsWith("BT25-092/"),
  )!.effectKey;
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: field("asuna").topCard.instanceId, effectKey }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      field("aegiochus").topCard.cardId === "BT24-101" &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.memory).toBe(before);
  expect(field("asuna").isSuspended).toBe(true);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain("oct06-latest-option");
  await finish();
});

it("Discord 1557077795321024543: KingSukamon selects three trash Assembly materials and pays 3", async () => {
  const { s, finish } = await launch("arena-oct06-king-sukamon-assembly", { autoDeclineOptional: true });
  const materials = [0, 1, 2].map((index) => `oct06-latest-king-material-${index}`);
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: "oct06-latest-king-sukamon",
      assembly: { materialInstanceIds: materials },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-031") &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  const king = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-031")!;
  expect(king.stack.map((c) => c.instanceId)).toEqual([...materials].reverse());
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.state.memory).toBe(7);
  await finish();
});

it("Discord 1557085470129922229: Dorbickmon selects five hand DigiXros materials and pays 3", async () => {
  const { s, finish } = await launch("arena-oct06-dorbickmon-digixros");
  const materials = [0, 1, 2, 3, 4].map((index) => `oct06-latest-dorbickmon-material-${index}`);
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: "oct06-latest-dorbickmon",
      digiXros: { materialInstanceIds: materials },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX3-014") &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  const source = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX3-014")!;
  expect(source.stack.map((c) => c.instanceId)).toEqual(expect.arrayContaining(materials));
  expect(source.stack).toHaveLength(5);
  expect(s.state.memory).toBe(7);
  await finish();
});

it("Discord 1557077795321024543: EX5 Chuumon's inherited deletion selects and plays a trash Chuumon suspended", async () => {
  const { s, field, finish } = await launch("arena-oct06-chuumon-trash-revival", { autoAcceptOptional: true });
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field("revival-host").permanentId,
      target: { kind: "permanent", permanentId: field("revival-enemy", 1).permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.pendingDecision?.kind === "chooseTargets" || s.state.pendingDecision?.kind === "selectCards",
  );
  const request = s.decisions.at(-1)!.req;
  expect(request.sourceCardId).toBe("EX5-045");
  expect(request.options?.candidateInstanceIds).toContain("oct06-latest-revival-target");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: request.kind as "chooseTargets" | "selectCards", instanceIds: ["oct06-latest-revival-target"] },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  const revived = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === "oct06-latest-revival-target");
  expect(revived?.isSuspended).toBe(true);
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain("oct06-latest-revival-target");
  await finish();
});

it("Discord 1557076811341500428: SnowGoblimon shows all three reveals, adds both legal cards and discards from hand", async () => {
  const { s, finish } = await launch("arena-oct06-snow-goblimon-reveal", { autoOrderCards: true });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "oct06-latest-snow-goblimon" })).toEqual({ ok: true });
  let previous = "";
  for (const index of [1, 2]) {
    await settle(
      () => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.decisionId !== previous,
    );
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.visibleCards?.map((c) => c.instanceId)).toEqual([
      "oct06-latest-snow-reveal-1",
      "oct06-latest-snow-reveal-2",
      "oct06-latest-snow-reveal-3",
    ]);
    expect(request.options?.candidateInstanceIds).toContain(`oct06-latest-snow-reveal-${index}`);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [`oct06-latest-snow-reveal-${index}`] },
      }),
    ).toEqual({ ok: true });
    previous = request.decisionId;
  }
  await settle(() => !!s.state.pendingDecision && s.state.pendingDecision.decisionId !== previous);
  const discard = s.decisions.at(-1)!.req;
  expect(discard.options?.candidateInstanceIds).toContain("oct06-latest-snow-discard");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: discard.decisionId,
      response: { kind: discard.kind as "chooseTargets" | "selectCards", instanceIds: ["oct06-latest-snow-discard"] },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual(
    expect.arrayContaining(["oct06-latest-snow-reveal-1", "oct06-latest-snow-reveal-2"]),
  );
  expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain("oct06-latest-snow-discard");
  expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe("oct06-latest-snow-reveal-3");
  await finish();
});
