import { CardKind, EffectTiming, Phase, getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { effectsOf } from "../effects/collect.js";
import { layDevScenario } from "../devScenario.js";
import type { IssueReproScenarioId } from "../issueReproScenarios.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";

async function start(id: IssueReproScenarioId, options: SetupEngineOptions = {}, moveBreeding = false) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, ...options },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  const intent = moveBreeding
    ? { type: "moveFromBreeding" as const, permanentId: s.state.players[0]!.breeding!.permanentId }
    : { type: "endPhase" as const };
  expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  if (s.state.phase === Phase.Breeding) {
    const result = s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
    expect(result).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(s.state.turnSeat);
  }
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}
function hand(s: ReturnType<typeof setupEngine>, id: string, seat: Seat = 0) {
  return s.state.players[seat]!.hand.find((c) => c.cardId === id)!;
}
function field(s: ReturnType<typeof setupEngine>, id: string, seat: Seat = 0) {
  return s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === id)!;
}
async function resolved(s: ReturnType<typeof setupEngine>, id: string) {
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === id) &&
      s.state.pendingDecision === undefined,
  );
}

describe("22 remaining player issues — playable behavioral reproductions", () => {
  it("#4962 uses all three EX12 materials for SeitenGokuumon's six-memory Assembly reduction", async () => {
    const run = await start("arena-issue-4962-seiten-ex12-assembly", {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
    });
    const { s } = run;
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: hand(s, "EX12-048").instanceId,
        assembly: { materialInstanceIds: s.state.players[0]!.trash.map((c) => c.instanceId) },
      }),
    ).toEqual({ ok: true });
    await resolved(s, "EX12-048");
    expect(s.state.memory).toBe(before - 7);
    expect(field(s, "EX12-048").stack).toHaveLength(3);
    await finish(run);
  });

  it("#4961 suspends Takato, grants Raid and declares Gallantmon's attack", async () => {
    const run = await start("arena-issue-4961-takato-raid-attack");
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: field(s, "ST7-08").permanentId,
        instanceId: hand(s, "EX2-011").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => field(s, "BT19-080").isSuspended);
    await advance(s.engine).finishAttack();
    expect(s.events.some((e) => e.kind === "attackDeclared")).toBe(true);
    expect(observe(s.engine).hasKeyword(field(s, "EX2-011"), "Raid")).toBe(true);
    await finish(run);
  });

  it("#4955 Minervamon de-digivolves after declining its optional play", async () => {
    const run = await start("arena-issue-4955-minervamon-dedigivolve", {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
    });
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: field(s, "BT26-029").permanentId,
        instanceId: hand(s, "BT24-041").instanceId,
      }),
    ).toEqual({ ok: true });
    await resolved(s, "BT24-041");
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-020");
    await finish(run);
  });

  it("#4952 Kotemon grants Piercing and DP to the same chosen TS Digimon", async () => {
    const run = await start(
      "arena-issue-4952-kotemon-piercing",
      { preferInstanceIds: ["arena-issue-4952-kotemon-piercing-0-field-0"] },
      true,
    );
    const { s } = run;
    expect(field(s, "BT26-008")).toBeDefined();
    const target = field(s, "BT26-033");
    expect(target.currentDP).toBe(target.baseDP + 3000);
    expect(observe(s.engine).hasPierce(target)).toBe(true);
    await finish(run);
  });

  it("#4950 Davis & Ken trashes three opposing sources after a DNA evolution", async () => {
    const run = await start("arena-issue-4950-davis-ken-dna-sources");
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        instanceId: hand(s, "ST9-05").instanceId,
        materialPermanentIds: [field(s, "ST9-04").permanentId, field(s, "ST9-09").permanentId],
      }),
    ).toEqual({ ok: true });
    await resolved(s, "BT16-085");
    expect(field(s, "BT16-085").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    await finish(run);
  });

  it("#4942 Jesmon plays on evolution and attack and resolves two Alliance instances", async () => {
    const run = await start("arena-issue-4942-jesmon-double-alliance");
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: field(s, "EX13-012").permanentId,
        instanceId: hand(s, "BT23-013").instanceId,
      }),
    ).toEqual({ ok: true });
    await resolved(s, "BT23-013");
    // Decline Jesmon's triggered extra attack if the token play offers it.
    if (observe(s.engine).isAttacking()) {
      await settle(() => s.events.some((e) => e.kind === "alliancePrompt"));
    } else {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: field(s, "BT23-013").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
    }
    for (let index = 0; index < 2; index++) {
      await settle(() => s.events.filter((e) => e.kind === "alliancePrompt").length === index + 1);
      const ally = field(s, index === 0 ? "ST12-12" : "BT6-082");
      expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId })).toEqual({
        ok: true,
      });
    }
    await advance(s.engine).finishAttack();
    expect(s.events.filter((e) => e.kind === "alliancePrompt")).toHaveLength(2);
    expect(field(s, "BT6-084")).toBeDefined();
    await finish(run);
  });

  it("#4947 Dragon Mode reacts when Physical Training digivolves the opponent by effect", async () => {
    const run = await start("arena-issue-4947-physical-training-reaction");
    const { s } = run;
    const training = field(s, "P-105");
    const source = (s.engine as unknown as { cardSourceOf(c: object): Parameters<typeof effectsOf>[1] }).cardSourceOf(
      training.topCard,
    );
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: training.topCard.instanceId, effectKey }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT16-027") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.events.some((e) => e.kind === "digivolved" && e.cardId === "BT1-060")).toBe(true);
    await finish(run);
  });

  it.each(["EX13-065", "EX13-066"])("#4957 Gankoomon uses %s as an Option from its sources", async (id) => {
    const preferences: string[] = [];
    const run = await start("arena-issue-4957-gankoomon-dual-sources", {
      preferInstanceIds: preferences,
      declinePrompts: ["Arts Digivolve"],
    });
    const { s } = run;
    const gankoomon = field(s, "EX13-061");
    preferences.push(gankoomon.stack.find((c) => c.cardId === id)!.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: gankoomon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === id)).toBe(true);
    expect(gankoomon.stack.some((c) => c.cardId === id)).toBe(false);
    expect(s.state.players[0]!.trash.some((c) => c.cardId === id)).toBe(true);
    if (id === "EX13-065") expect(field(s, "BT1-080", 1).currentDP).toBeLessThan(field(s, "BT1-080", 1).baseDP);
    else expect(field(s, "BT1-080", 1)).toBeUndefined();
    await finish(run);
  });

  it("#4951 Grandiskuwagamon's inherited Piercing settles without repeating triggers", async () => {
    const run = await start("arena-issue-4951-okuwamon-inherited");
    const { s } = run;
    expect(observe(s.engine).hasPierce(field(s, "BT9-055"))).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT1-009").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => field(s, "BT1-009") !== undefined && s.state.pendingDecision === undefined);
    expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "P-075")).toHaveLength(0);
    const defender = field(s, "BT1-024", 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: field(s, "BT9-055").permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    expect(s.events.filter((e) => e.kind === "securityRevealed")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    await finish(run);
  });

  it("#4941 Candlemon's inherited prevention is inactive while it is the top card", async () => {
    const run = await start("arena-issue-4941-candlemon-top-inheritance");
    const { s } = run;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const security = s.state.players[0]!.security.length;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: hand(s, "BT6-095", 1).instanceId })).toEqual({
      ok: true,
    });
    await settle(() => field(s, "BT18-030") === undefined && s.state.pendingDecision === undefined);
    expect(field(s, "BT18-030")).toBeUndefined();
    expect(s.state.players[0]!.security.length).toBe(security);
    expect(s.decisions.some((d) => d.req.sourceCardId === "BT18-030")).toBe(false);
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await finish(run);
  });

  it("#4962 offers EX12 Assembly when Hakubamon plays SeitenGokuumon by effect", async () => {
    const run = await start("arena-issue-4962-seiten-ex12-assembly", {
      declinePrompts: ["You may play 1 Tamer", "Attack with this Digimon"],
    });
    const { s } = run;
    const before = s.state.memory;
    const hakuba = field(s, "EX12-043");
    const source = (s.engine as unknown as { cardSourceOf(c: object): Parameters<typeof effectsOf>[1] }).cardSourceOf(
      hakuba.topCard,
    );
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: hakuba.topCard.instanceId, effectKey }),
    ).toEqual({ ok: true });
    await resolved(s, "EX12-048");
    expect(s.decisions.some((d) => d.req.options?.assemblyCardId === "EX12-048")).toBe(true);
    expect(field(s, "EX12-048").stack).toHaveLength(3);
    expect(s.state.memory).toBe(before - 5);
    await finish(run);
  });

  it("#4910 DUAL Blanc's Option effect affects Diarbbitmon despite Digimon immunity", async () => {
    const run = await start("arena-issue-4910-diarbbitmon-dual-option", {
      declinePrompts: ["You may play 1", "Arts Digivolve"],
      preferInstanceIds: ["arena-issue-4910-diarbbitmon-dual-option-1-field-1"],
    });
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: field(s, "EX12-051").permanentId,
        instanceId: hand(s, "EX12-052").instanceId,
      }),
    ).toEqual({ ok: true });
    await resolved(s, "EX12-052");
    const diar = field(s, "EX12-052");
    expect(diar.immuneToOpponentDigimonEffects).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT1-082").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const before = diar.currentDP;
    expect(
      s.engine.applyIntent(1, { type: "playCard", instanceId: hand(s, "EX13-065", 1).instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await resolved(s, "EX13-065");
    expect(diar.immuneToOpponentDigimonEffects).toBe(true);
    expect(diar.currentDP).toBe(before - 3000);
    await finish(run);
  });

  it.each([true, false])(
    "#4936 offers inherited Barrier for both Examon DNA battles (accept second: %s)",
    async (acceptSecond) => {
      const preferred: string[] = [];
      const run = await start("arena-issue-4936-examon-repeat-barrier", {
        preferInstanceIds: preferred,
        declinePrompts: ["you may play or use"],
      });
      const { s } = run;
      const defender = field(s, "EX13-060", 1);
      preferred.push(defender.permanentId);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          materialPermanentIds: [field(s, "BT1-080").permanentId, field(s, "ST2-10").permanentId],
          instanceId: hand(s, "EX13-045").instanceId,
        }),
      ).toEqual({ ok: true });
      for (let count = 1; count <= 2; count++) {
        await settle(() => s.events.filter((e) => e.kind === "barrierPrompt").length === count);
        expect(
          s.engine.applyIntent(1, {
            type: "respondBarrier",
            permanentId: defender.permanentId,
            accept: count === 1 || acceptSecond,
          }),
        ).toEqual({ ok: true });
      }
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(s.events.filter((e) => e.kind === "barrierPrompt")).toHaveLength(2);
      expect(s.state.players[1]!.security).toHaveLength(acceptSecond ? 1 : 0);
      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(acceptSecond);
      await finish(run);
    },
  );

  it.each([
    ["arena-issue-4937-grademon-dual-immunity", "EX13-057", "EX13-065"],
    ["arena-issue-4937-grademon-dual-immunity", "EX13-057", "EX13-066"],
    ["arena-issue-4937-bt20-grademon-dual-immunity", "BT20-053", "EX13-065"],
    ["arena-issue-4937-bt20-grademon-dual-immunity", "BT20-053", "EX13-066"],
  ] as const)("#4937 %s lets %s be affected by the Option face of %s", async (scenarioId, grademon, option) => {
    const preferred: string[] = [];
    const run = await start(scenarioId, {
      preferInstanceIds: preferred,
      declinePrompts: ["you may play 1", "Arts Digivolve"],
    });
    const { s } = run;
    const protectedDigimon = field(s, "EX13-055");
    preferred.push(protectedDigimon.permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: protectedDigimon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(protectedDigimon.topCard.cardId).toBe(grademon);
    expect(protectedDigimon.currentDP).toBe(12000);
    expect(protectedDigimon.immuneToOpponentDigimonEffects).toBe(true);
    // Paying 12 from six memory passes six to the opponent, so the Option
    // resolves before the immunity expires at the end of that opponent's turn.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT1-082").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(protectedDigimon.immuneToOpponentDigimonEffects).toBe(true);
    // BT20-051's inherited opponent-turn bonus adds another 2000 DP.
    expect(protectedDigimon.currentDP).toBe(14000);
    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: hand(s, option, 1).instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await resolved(s, option);
    expect({
      dp: protectedDigimon.currentDP,
      card: protectedDigimon.topCard.cardId,
      sources: protectedDigimon.stack.map((c) => c.cardId),
    }).toMatchObject(
      option === "EX13-065"
        ? { dp: 11000, card: grademon, sources: ["BT20-051", "EX13-055"] }
        : { card: "EX13-055", sources: ["BT20-051"] },
    );
    await finish(run);
  });

  it.each([true, false])(
    "#4935 activates Guard after Arts Digivolve only for another Digimon (other target: %s)",
    async (otherTarget) => {
      const preferred: string[] = [];
      const run = await start("arena-issue-4935-blanc-arts-guard", {
        preferInstanceIds: preferred,
        declinePrompts: ["You may play 1 play cost 4"],
      });
      const { s } = run;
      const blanc = field(s, "BT23-076");
      const ally = field(s, "BT1-080");
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: hand(s, "EX13-065").instanceId,
          useAs: "option",
        }),
      ).toEqual({ ok: true });
      await settle(() => blanc.topCard.cardId === "EX13-065" && s.state.pendingDecision === undefined);
      expect(observe(s.engine).hasKeyword(blanc, "Guard")).toBe(true);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      preferred.push(otherTarget ? ally.permanentId : blanc.permanentId);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: hand(s, "ST1-16", 1).instanceId })).toEqual({
        ok: true,
      });
      await resolved(s, "ST1-16");
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === ally.permanentId)).toBe(true);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-065")).toBe(false);
      expect(s.decisions.filter((d) => d.req.promptText?.includes("Guard"))).toHaveLength(otherTarget ? 1 : 0);
      await finish(run);
    },
  );

  it("#4917 places Biting Crush after paying a demon lord without a deletion target", async () => {
    const run = await start("arena-issue-4917-biting-crush-placement");
    const { s } = run;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "EX5-069").instanceId })).toEqual({
      ok: true,
    });
    await resolved(s, "EX5-069");
    expect(field(s, "EX5-069")).toBeDefined();
    await finish(run);
  });

  it("#4932 reactivates the thin-security DP reduction for both opponents", async () => {
    const run = await start("arena-issue-4932-kentaurosmon-security", {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
    });
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: field(s, "ST24-10").permanentId,
        instanceId: hand(s, "EX13-036").instanceId,
      }),
    ).toEqual({ ok: true });
    await resolved(s, "EX13-036");
    expect(s.state.players[1]!.battleArea.map((p) => p.currentDP)).toEqual([3000, 3000]);
    await finish(run);
  });

  it("#4918 restricts the evolution attack to the player after evolving Rie", async () => {
    const run = await start("arena-issue-4918-lordknightmon-player-attack");
    const { s } = run;
    const rie = field(s, "EX13-074");
    const key = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(rie)).find((e) =>
      e.effectKey.startsWith("EX13-074/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: rie.topCard.instanceId, effectKey: key }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "attackDeclared"));
    await advance(s.engine).finishAttack();
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectActivated" && e.sourceCardId === "EX13-074") &&
        s.state.pendingDecision === undefined,
    );
    const attacks = s.events.filter((e) => e.kind === "attackDeclared");
    expect(attacks).toHaveLength(1);
    expect(attacks[0]).toMatchObject({ target: { kind: "player" }, attackerCardId: "BT22-067" });
    await finish(run);
  });

  it("#4912 protects MetalSeadramon while its owner has memory during an effect battle", async () => {
    const run = await start("arena-issue-4912-deep-savers-battle", { declinePrompts: ["you may play or use"] });
    const { s } = run;
    const metal = field(s, "EX8-026", 1);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: field(s, "EX13-024").permanentId,
        instanceId: hand(s, "EX13-045").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === metal.permanentId)).toBe(true);
    expect(
      s.events.some(
        (e) => e.kind === "effectTriggered" && e.sourceCardId === "EX13-045" && e.timing === "WhenDigivolving",
      ),
    ).toBe(true);
    expect(s.state.players[1]!.security[0]?.faceUp).toBe(true);
    await finish(run);
  });

  it("#4911 finishes two consecutive attacks with three checks and high DP", async () => {
    const run = await start("arena-issue-4911-mervamon-multiple-checks");
    const { s } = run;
    const attackers = s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT26-081");
    const allies = s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT26-029");
    for (const [index, attacker] of attackers.entries()) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      for (const ally of allies.slice(index * 2, index * 2 + 2)) {
        await settle(() => s.state.combatWindow?.kind === "alliance");
        expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId })).toEqual({
          ok: true,
        });
      }
      await advance(s.engine).finishAttack();
    }
    const checks = s.events.filter((e) => e.kind === "securityRevealed");
    expect(checks).toHaveLength(6);
    expect(checks.every((e) => e.kind === "securityRevealed" && (e.attackerDP ?? 0) >= 35000)).toBe(true);
    expect(s.events.filter((e) => e.kind === "alliancePrompt")).toHaveLength(4);
    expect(s.state.combatWindow).toBeUndefined();
    await finish(run);
  });

  it("#4954 LordKnightmon's printed inspector text agrees with its six-memory play", async () => {
    const run = await start("arena-issue-4954-lordknightmon-inspector", {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
    });
    const { s } = run;
    const definition = getCardDefinition("AD1-018")!;
    expect(definition.effectText).toContain(
      "if you have a Digimon with [Knightmon] or [Lucemon] in its name, reduce the play cost by 5",
    );
    expect(definition.effectText).toContain("[All Turns] [Once Per Turn]");
    expect(definition.securityEffectText).toContain("[Security]");
    expect(definition.effectText).not.toContain("4 or more cards");
    const before = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "AD1-018").instanceId })).toEqual({
      ok: true,
    });
    await resolved(s, "AD1-018");
    expect(s.state.memory).toBe(before - 6);
    expect(field(s, "AD1-018")).toBeDefined();
    await finish(run);
  });

  it("#4914 Blanc's DUAL Option reduces DP through Digimon immunity and cannot be played as a Digimon", async () => {
    const preferred: string[] = [];
    const run = await start("arena-issue-4914-blanc-dual-option", {
      declinePrompts: ["You may play 1", "Arts Digivolve"],
      preferInstanceIds: preferred,
    });
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: field(s, "EX12-051").permanentId,
        instanceId: hand(s, "EX12-052").instanceId,
      }),
    ).toEqual({ ok: true });
    await resolved(s, "EX12-052");
    const target = field(s, "EX12-052");
    preferred.push(target.permanentId);
    expect(target.immuneToOpponentDigimonEffects).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT1-082").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const blanc = hand(s, "EX13-065", 1);
    expect(
      s.state.players[1]!.battleArea.filter((p) =>
        getCardDefinition(p.topCard.cardId)?.kinds.includes(CardKind.Digimon),
      ),
    ).toHaveLength(1);
    const before = s.state.memory;
    const dp = target.currentDP;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: blanc.instanceId, useAs: "digimon" })).toEqual({
      ok: false,
      reason: "not-playable-kind",
    });
    expect(s.state.memory).toBe(before);
    expect(hand(s, "EX13-065", 1).instanceId).toBe(blanc.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: blanc.instanceId, useAs: "option" })).toEqual({
      ok: true,
    });
    await resolved(s, "EX13-065");
    expect(target.immuneToOpponentDigimonEffects).toBe(true);
    expect(target.currentDP).toBe(dp - 3000);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === blanc.instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX13-065")).toBe(false);
    await finish(run);
  });

  it("#4905 Magnamon trashes six sources for Merciful's granted colors before returning it to hand", async () => {
    const run = await start("arena-issue-4905-magnamon-merciful-colors");
    const { s } = run;
    const target = field(s, "EX13-077", 1);
    const targetId = target.topCard.instanceId;
    const sources = target.stack.map((c) => c.instanceId);
    expect(new Set(observe(s.engine).effectiveColors(target))).toEqual(
      new Set(["White", "Red", "Blue", "Black", "Green", "Yellow"]),
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "P-117").instanceId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    const veemon = field(s, "P-117");
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: veemon.permanentId,
        instanceId: hand(s, "ST17-13").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.hand.some((c) => c.instanceId === targetId) && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual(sources.toReversed());
    expect(s.state.players[1]!.hand.map((c) => c.instanceId)).toEqual([targetId]);
    expect(s.events.find((e) => e.kind === "cardsMoved" && e.trashedSources?.sourceCardId === "ST17-13")).toMatchObject(
      { kind: "cardsMoved", to: "trash", instanceIds: sources.toReversed() },
    );
    expect(veemon.topCard.cardId).toBe("ST17-13");
    await finish(run);
  });
});
