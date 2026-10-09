import { Phase, type DecisionRequest } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";

async function launch(id: DevScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
  const instance = (zone: string, index: number, seat: 0 | 1 = 0) => `${id}-${seat}-${zone}-${index}`;
  const nextDecision = async (kind: DecisionRequest["kind"], after?: string): Promise<DecisionRequest> => {
    await settle(() => s.state.pendingDecision?.kind === kind && s.state.pendingDecision.decisionId !== after);
    return s.decisions.at(-1)!.req;
  };
  const respond = (request: DecisionRequest, response: Parameters<typeof s.engine.applyIntent>[1] & object) =>
    expect(s.engine.applyIntent(request.seat, response)).toEqual({ ok: true });
  const idle = () => settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  const finish = async () => {
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  return { s, instance, nextDecision, respond, idle, finish };
}

it("GitHub #5073 arena: e-Pulse offers and plays a [BEATBREAK] Liollmon from the trash", async () => {
  const { s, instance, nextDecision, respond, idle, finish } = await launch("arena-issue-5073-epulse-trash");
  const epulse = instance("hand", 0);
  const handCougarmon = instance("hand", 1);
  const trashLiollmon = instance("trash", 0);
  const trashMurasamemon = instance("trash", 1);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: epulse })).toEqual({ ok: true });

  const optional = await nextDecision("optional");
  expect(optional.sourceCardId).toBe("ST23-15");
  respond(optional, {
    type: "respondDecision",
    decisionId: optional.decisionId,
    response: { kind: "optional", accept: true },
  });

  const choice = await nextDecision("selectCards", optional.decisionId);
  expect(choice.sourceCardId).toBe("ST23-15");
  expect(choice.options?.min).toBe(0);
  expect(choice.options?.max).toBe(1);
  expect([...(choice.options?.candidateInstanceIds ?? [])].sort()).toEqual([handCougarmon, trashLiollmon].sort());
  expect(choice.options?.candidateInstanceIds).not.toContain(trashMurasamemon);
  expect(choice.options?.visibleCards?.map((card) => card.instanceId)).toEqual(
    expect.arrayContaining([trashLiollmon, trashMurasamemon]),
  );
  respond(choice, {
    type: "respondDecision",
    decisionId: choice.decisionId,
    response: { kind: "selectCards", instanceIds: [trashLiollmon] },
  });
  await idle();

  const player = s.state.players[0]!;
  expect(s.events).toContainEqual(
    expect.objectContaining({ kind: "cardPlayed", fromZone: "trash", instanceId: trashLiollmon, cardId: "ST23-02" }),
  );
  expect(player.battleArea.map((p) => p.topCard.instanceId)).toEqual(expect.arrayContaining([trashLiollmon, epulse]));
  expect(player.trash.map((card) => card.instanceId)).toEqual([trashMurasamemon]);
  expect(player.hand.map((card) => card.instanceId)).toContain(handCougarmon);
  expect(s.state.memory).toBe(2);
  await finish();
});

it("GitHub #5106 arena: EX5 Chuumon's inherited deletion effect replays the same Chuumon from the trash", async () => {
  const { s, instance, nextDecision, respond, idle, finish } = await launch("arena-issue-5106-chuumon-self-replay");
  const etemon = "arena-issue-5106-chuumon-self-replay-0-field-0";
  const inheritedChuumon = instance("source-0", 0);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: etemon,
      target: { kind: "permanent", permanentId: "arena-issue-5106-chuumon-self-replay-1-field-0" },
    }),
  ).toEqual({ ok: true });

  const optional = await nextDecision("optional");
  expect(optional.sourceCardId).toBe("EX5-045");
  respond(optional, {
    type: "respondDecision",
    decisionId: optional.decisionId,
    response: { kind: "optional", accept: true },
  });
  await advance(s.engine).finishAttack();
  await idle();

  const player = s.state.players[0]!;
  expect(s.events).toContainEqual(
    expect.objectContaining({ kind: "cardPlayed", fromZone: "trash", instanceId: inheritedChuumon, cardId: "EX5-045" }),
  );
  const revived = player.battleArea.find((p) => p.topCard.instanceId === inheritedChuumon);
  expect(revived?.isSuspended).toBe(true);
  expect(player.battleArea).toHaveLength(1);
  expect(player.trash.map((card) => card.cardId)).toEqual(["EX1-052"]);
  // With a single legal Chuumon, accepting the optional plays it without a separate selection.
  expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX5-045").map(({ req }) => req.kind)).toEqual([
    "optional",
  ]);
  await finish();
});

it("GitHub #5049 arena: BlitzGreymon's End of Turn DNA can be declined and the attack still happens", async () => {
  const { s, nextDecision, respond, finish } = await launch("arena-issue-5049-decline-dna");
  const blitz = "arena-issue-5049-decline-dna-0-field-0";
  const cres = "arena-issue-5049-decline-dna-0-field-1";
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

  const dna = await nextDecision("optional");
  expect(dna.sourceCardId).toBe("AD1-009");
  expect(dna.promptText).toMatch(/DNA/i);
  respond(dna, { type: "respondDecision", decisionId: dna.decisionId, response: { kind: "optional", accept: false } });

  const attack = await nextDecision("optional", dna.decisionId);
  expect(attack.sourceCardId).toBe("AD1-009");
  expect(attack.promptText).toMatch(/attack/i);
  respond(attack, {
    type: "respondDecision",
    decisionId: attack.decisionId,
    response: { kind: "optional", accept: true },
  });
  const attacker = await nextDecision("chooseTargets", attack.decisionId);
  expect([...(attacker.options?.candidateInstanceIds ?? [])].sort()).toEqual([blitz, cres].sort());
  respond(attacker, {
    type: "respondDecision",
    decisionId: attacker.decisionId,
    response: { kind: "chooseTargets", instanceIds: [blitz] },
  });
  const target = await nextDecision("selectCards", attacker.decisionId);
  expect(target.options?.candidateInstanceIds).toEqual(["player"]);
  respond(target, {
    type: "respondDecision",
    decisionId: target.decisionId,
    response: { kind: "selectCards", instanceIds: ["player"] },
  });
  for (let i = 0; i < 4; i++) await advance(s.engine).finishAttack();
  await settle(() => s.events.some((e) => e.kind === "attackEnded"));

  const field = s.state.players[0]!.battleArea;
  expect(field.find((p) => p.permanentId === blitz)?.topCard.cardId).toBe("AD1-009");
  expect(field.find((p) => p.permanentId === cres)?.topCard.cardId).toBe("AD1-012");
  expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX9-021");
  expect(s.events).toContainEqual(expect.objectContaining({ kind: "attackDeclared" }));
  expect(s.state.players[1]!.security.length).toBeLessThan(3);
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  await finish();
});

it("GitHub #5099 arena: Mervamon plays Iliad cards from hand and trash within 8 total cost", async () => {
  const { s, instance, nextDecision, respond, idle, finish } = await launch("arena-issue-5099-mervamon-iliad");
  const aegiochusmon = "arena-issue-5099-mervamon-iliad-0-field-0";
  const opponent = "arena-issue-5099-mervamon-iliad-1-field-0";
  const handKamemon = instance("hand", 1);
  const handHyokomon = instance("hand", 2);
  const handWrongTrait = instance("hand", 3);
  const trashCyclonemon = instance("trash", 0);
  const trashSalamon = instance("trash", 1);
  expect(
    s.engine.applyIntent(0, { type: "digivolve", instanceId: instance("hand", 0), permanentId: aegiochusmon }),
  ).toEqual({ ok: true });

  const optional = await nextDecision("optional");
  expect(optional.sourceCardId).toBe("BT26-081");
  respond(optional, {
    type: "respondDecision",
    decisionId: optional.decisionId,
    response: { kind: "optional", accept: true },
  });
  const choice = await nextDecision("selectCards", optional.decisionId);
  expect(choice.sourceCardId).toBe("BT26-081");
  expect(choice.options?.min).toBe(0);
  expect([...(choice.options?.candidateInstanceIds ?? [])].sort()).toEqual(
    [handKamemon, handHyokomon, trashCyclonemon, trashSalamon].sort(),
  );
  expect(choice.options?.candidateInstanceIds).not.toContain(handWrongTrait);
  respond(choice, {
    type: "respondDecision",
    decisionId: choice.decisionId,
    response: { kind: "selectCards", instanceIds: [handKamemon, trashCyclonemon] },
  });
  await idle();

  const player = s.state.players[0]!;
  expect(player.battleArea.map((p) => p.topCard.instanceId)).toEqual(
    expect.arrayContaining([handKamemon, trashCyclonemon]),
  );
  expect(s.events).toContainEqual(
    expect.objectContaining({ kind: "cardPlayed", fromZone: "trash", instanceId: trashCyclonemon }),
  );
  expect(s.events).toContainEqual(
    expect.objectContaining({ kind: "cardPlayed", fromZone: "hand", instanceId: handKamemon }),
  );
  expect(player.trash.map((card) => card.instanceId)).toEqual([trashSalamon]);
  expect(player.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([handHyokomon, handWrongTrait]));
  expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === opponent)?.currentDP).toBe(3000);
  expect(s.state.memory).toBe(3);
  await finish();
});

it("GitHub #5106 arena: KingSukamon's When Digivolving cost offers Chuumon/Sukamon from hand and sources", async () => {
  const { s, instance, nextDecision, respond, idle, finish } = await launch("arena-issue-5106-king-sukamon-cost");
  const sukamon = "arena-issue-5106-king-sukamon-cost-0-field-0";
  const metalGreymon = "arena-issue-5106-king-sukamon-cost-1-field-0";
  const handChuumon = instance("hand", 1);
  const sourceChuumon = instance("source-0", 0);
  const oldTop = instance("field", 0);
  expect(s.engine.applyIntent(0, { type: "digivolve", instanceId: instance("hand", 0), permanentId: sukamon })).toEqual(
    { ok: true },
  );

  const optional = await nextDecision("optional");
  expect(optional.sourceCardId).toBe("EX13-031");
  respond(optional, {
    type: "respondDecision",
    decisionId: optional.decisionId,
    response: { kind: "optional", accept: true },
  });
  const cost = await nextDecision("selectCards", optional.decisionId);
  expect(cost.sourceCardId).toBe("EX13-031");
  expect([...(cost.options?.candidateInstanceIds ?? [])].sort()).toEqual([handChuumon, sourceChuumon, oldTop].sort());
  respond(cost, {
    type: "respondDecision",
    decisionId: cost.decisionId,
    response: { kind: "selectCards", instanceIds: [handChuumon] },
  });
  await idle();

  expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([handChuumon]);
  const king = s.state.players[0]!.battleArea.find((p) => p.permanentId === sukamon)!;
  expect(king.topCard.cardId).toBe("EX13-031");
  expect(king.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([sourceChuumon, oldTop]));
  expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === metalGreymon)?.currentDP).toBe(3000);
  await finish();
});

it("GitHub #5118 arena: BT18-030 Candlemon opens its reveal selection and adds the yellow Data card", async () => {
  const { s, instance, nextDecision, respond, idle, finish } = await launch("arena-issue-5118-candlemon-search");
  const dynasmon = instance("deck", 2);
  const remainder = [instance("deck", 1), instance("deck", 3)];
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: instance("hand", 0) })).toEqual({ ok: true });

  const choice = await nextDecision("selectCards");
  expect(choice.sourceCardId).toBe("BT18-030");
  expect(choice.options?.visibleCards?.map((card) => card.instanceId)).toEqual([remainder[0], dynasmon, remainder[1]]);
  expect(choice.options?.candidateInstanceIds).toEqual([dynasmon]);
  respond(choice, {
    type: "respondDecision",
    decisionId: choice.decisionId,
    response: { kind: "selectCards", instanceIds: [dynasmon] },
  });
  await idle();

  expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(dynasmon);
  expect(
    s.state.players[0]!.deck.slice(-2)
      .map((card) => card.instanceId)
      .sort(),
  ).toEqual([...remainder].sort());
  expect(s.state.phase).toBe(Phase.Main);
  await finish();
});

it("GitHub #5135 arena: Ai & Mako searches on play and its Your Turn memory effect fires on a purple digivolve", async () => {
  const { s, instance, nextDecision, respond, idle, finish } = await launch("arena-issue-5135-ai-mako-your-turn");
  const impmon = "arena-issue-5135-ai-mako-your-turn-0-field-0";
  const beelzemon = instance("deck", 2);
  const remainder = [instance("deck", 1), instance("deck", 3), instance("deck", 4)];
  const drawn = instance("deck", 0);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: instance("hand", 0) })).toEqual({ ok: true });

  const search = await nextDecision("selectCards");
  expect(search.sourceCardId).toBe("ST14-11");
  expect(search.options?.min).toBe(1);
  expect(search.options?.visibleCards?.map((card) => card.instanceId)).toEqual([
    remainder[0],
    beelzemon,
    remainder[1],
    remainder[2],
  ]);
  expect(search.options?.candidateInstanceIds).toEqual([remainder[0], beelzemon, remainder[1]]);
  respond(search, {
    type: "respondDecision",
    decisionId: search.decisionId,
    response: { kind: "selectCards", instanceIds: [beelzemon] },
  });
  await idle();
  expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(beelzemon);
  expect(s.state.memory).toBe(5);

  expect(s.engine.applyIntent(0, { type: "digivolve", instanceId: instance("hand", 1), permanentId: impmon })).toEqual({
    ok: true,
  });
  const memoryEffect = await nextDecision("optional", search.decisionId);
  expect(memoryEffect.sourceCardId).toBe("ST14-11");
  respond(memoryEffect, {
    type: "respondDecision",
    decisionId: memoryEffect.decisionId,
    response: { kind: "optional", accept: true },
  });
  const returned = await nextDecision("selectCards", memoryEffect.decisionId);
  expect(returned.sourceCardId).toBe("ST14-11");
  expect(returned.options?.candidateInstanceIds).toContain(drawn);
  respond(returned, {
    type: "respondDecision",
    decisionId: returned.decisionId,
    response: { kind: "selectCards", instanceIds: [drawn] },
  });
  await idle();

  const player = s.state.players[0]!;
  expect(player.battleArea.find((p) => p.permanentId === impmon)?.topCard.cardId).toBe("ST14-05");
  expect(player.battleArea.find((p) => p.topCard.cardId === "ST14-11")?.isSuspended).toBe(true);
  expect(player.hand.map((card) => card.instanceId)).not.toContain(drawn);
  expect(player.deck.map((card) => card.instanceId)).toContain(drawn);
  expect(s.state.memory).toBe(4);
  await finish();
});
