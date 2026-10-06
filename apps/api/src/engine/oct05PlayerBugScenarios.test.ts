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
it("#4990 repeats end-of-turn timing after Main resumes, without starting a fifth phase", async () => {
  const run = await start("arena-issue-4990-end-of-turn-label", { declinePrompts: ["Attack"] });
  const { s } = run;
  // A declined optional is explained by its decision and never announced, so each
  // End of Turn window is counted by its activation confirmation.
  const engageWindows = () =>
    s.decisions.filter(
      ({ req }) =>
        req.kind === "optional" &&
        req.sourceCardId === "EX13-013" &&
        req.options?.timing === "EndOfYourTurn" &&
        req.options.activationConfirmation === true,
    );
  const engageAnnouncements = () =>
    s.events.filter(
      (e) =>
        e.kind === "effectTriggered" &&
        e.sourceCardId === "EX13-013" &&
        e.timing === EffectTiming[EffectTiming.OnEndTurn],
    );
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT1-009").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      field(s, "BT9-111").stack.length === 0 && engageWindows().length === 1 && s.state.pendingDecision === undefined,
  );
  await advance(s.engine).waitForMainPhase(0);
  expect(s.state.memory).toBe(1);
  expect(s.state.turnCount).toBe(1);
  expect(s.events.filter((e) => e.kind === "turnEnded")).toHaveLength(0);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT1-009").instanceId })).toEqual({
    ok: true,
  });
  await main1(s);
  expect(engageWindows()).toHaveLength(2);
  expect(engageAnnouncements()).toHaveLength(0);
  expect(
    s.events
      .filter((e) => e.kind === "phaseChanged" && e.turnSeat === 0)
      .map((e) => (e.kind === "phaseChanged" ? e.phase : "")),
  ).toEqual([Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main]);
  expect(s.events.filter((e) => e.kind === "turnEnded" && e.endingSeat === 0)).toHaveLength(1);
  await finish(run);
});
it("#4981/#4987 preserves Dantemon Link +6 after Seven Code PAD evolution crosses memory", async () => {
  const run = await start("arena-issue-4981-dantemon-seven-code", {
    declinePrompts: ["Then, this Digimon may attack", "Attack", "Battle"],
  });
  const { s } = run;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT26-102").instanceId })).toEqual({
    ok: true,
  });
  await main1(s);
  const dante = field(s, "BT26-086");
  expect(dante).toBeDefined();
  expect(observe(s.engine).linkMaxDelta(dante)).toBe(6);
  expect(dante.linked.length).toBeGreaterThanOrEqual(6);
  expect(s.decisions.some((d) => d.req.promptText.includes("link cards to trash"))).toBe(false);
  await finish(run);
});
it("#4988 Examon suspends opposing Tamers even with fewer than five targets", async () => {
  const run = await start("arena-issue-4988-examon-tamers", { declinePrompts: ["Attack"] });
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [field(s, "BT1-080").permanentId, field(s, "BT1-044").permanentId],
      instanceId: hand(s, "BT23-047").instanceId,
    }),
  ).toEqual({ ok: true });
  await resolved(s, "BT23-047");
  expect(s.state.players[1]!.battleArea.every((p) => p.isSuspended)).toBe(true);
  await finish(run);
});
it("#4968 drawing reactions see the post-discard hand when Ogremon and Dobermon are trashed together", async () => {
  const run = await start("arena-issue-4968-hand-trash-draw", { autoSelectCards: false });
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "BT1-076").permanentId,
      instanceId: hand(s, "BT11-057").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const d = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: d.decisionId,
      response: { kind: "selectCards", instanceIds: [hand(s, "BT24-045").instanceId, hand(s, "BT26-069").instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.events.filter(
        (e) => e.kind === "cardsMoved" && e.from === "deck" && e.to === "hand" && e.drawReason !== "digivolution",
      ).length >= 2,
  );
  expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT24-045")).toBe(true);
  expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-069")).toBe(true);
  await finish(run);
});
it("#4977 KingEtemon completes evolution and trash play with three named Digimon", async () => {
  const run = await start("arena-issue-4977-kingetemon-continuous");
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "EX13-031").permanentId,
      instanceId: hand(s, "EX13-035").instanceId,
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  await resolved(s, "EX13-035");
  expect(field(s, "BT1-080", 1).currentDP).toBe(9000);
  expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
  await finish(run);
});
it("#4974 arena Gaiomon Reboot trashes opposing security on turn change", async () => {
  const run = await start("arena-issue-4974-gaiomon-reboot");
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(s, "BT9-068").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  const before = s.state.players[1]!.security.length;
  advance(s.engine).endMainPhaseIfOpen(0);
  await main1(s);
  expect(s.state.players[1]!.security).toHaveLength(before - 1);
  await finish(run);
});
it("#4979 Detach protects linked Weatherdramon from MetalMamemon's bottom-deck effect", async () => {
  const run = await start("arena-issue-4979-weather-detach");
  const { s } = run;
  advance(s.engine).endMainPhaseIfOpen(0);
  await main1(s);
  s.state.memory = 10;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: hand(s, "EX9-018", 1).instanceId })).toEqual({
    ok: true,
  });
  await resolved(s, "EX9-018");
  expect(field(s, "BT26-037")).toBeDefined();
  expect(field(s, "BT26-037").linked).toHaveLength(0);
  expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT26-063")).toBe(true);
  await finish(run);
});
it("#4984 Super Hacking may link the Copipemon just trashed by a security battle", async () => {
  const run = await start("arena-issue-4984-super-hacking-security");
  const { s } = run;
  advance(s.engine).endMainPhaseIfOpen(0);
  await main1(s);
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: field(s, "BT1-010", 1).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(field(s, "BT26-010").linked.map((c) => c.cardId)).toContain("BT26-084");
  await finish(run);
});
it("#4973 DUAL Option use affects Atratusmon despite immunity to Digimon effects", async () => {
  const run = await start("arena-issue-4973-dual-option-immunity");
  const { s } = run;
  advance(s.engine).endMainPhaseIfOpen(0);
  await main1(s);
  expect(
    s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: field(s, "ST23-08", 1).permanentId,
      instanceId: hand(s, "ST23-09", 1).instanceId,
    }),
  ).toEqual({ ok: true });
  await resolved(s, "ST23-09");
  await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(observe(s.engine).isRestrictedByEffect(field(s, "ST23-09", 1), "beAffected", "Digimon")).toBe(true);
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "ST24-07").instanceId, useAs: "option" }),
  ).toEqual({ ok: true });
  await resolved(s, "ST24-07");
  expect(field(s, "ST23-09", 1)).toBeUndefined();
  await finish(run);
});
it("#4978 Rosemon newly evolved by Lilamon reacts while Yoshino and Keenan resolves", async () => {
  const run = await start("arena-issue-4978-rosemon-tamer-reaction");
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(s, "ST24-10").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(field(s, "ST24-03")).toBeDefined();
  expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-049")).toBe(true);
  await finish(run);
});
it("#4985 both Alliance instances resolve before the attack continues", async () => {
  const run = await start("arena-issue-4985-double-alliance");
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "EX13-012").permanentId,
      instanceId: hand(s, "BT23-013").instanceId,
    }),
  ).toEqual({ ok: true });
  await resolved(s, "BT23-013");
  expect(observe(s.engine).isAttacking()).toBe(true);
  for (const [index, id] of ["ST12-12", "BT6-082"].entries()) {
    await settle(() => s.events.filter((e) => e.kind === "alliancePrompt").length === index + 1);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: field(s, id).permanentId })).toEqual({
      ok: true,
    });
  }
  await advance(s.engine).finishAttack();
  expect(s.events.filter((e) => e.kind === "alliancePrompt")).toHaveLength(2);
  await finish(run);
});
it("#4965 Raid can be declined while retaining the original player attack", async () => {
  const run = await start("arena-issue-4965-optional-raid", {
    autoSelectCards: false,
    declinePrompts: ["You may play"],
  });
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(s, "ST24-07").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.promptText.includes("Raid"),
  );
  const d = s.decisions.at(-1)!.req;
  expect(d.options?.min).toBe(0);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: d.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(field(s, "BT1-080", 1)).toBeDefined();
  expect(s.events.some((e) => e.kind === "securityChecked")).toBe(true);
  await finish(run);
});
it("#4967 public Assembly play remains legal with DNA materials simultaneously on the field", async () => {
  const run = await start("arena-issue-4967-assembly-with-dna");
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: hand(s, "EX13-016").instanceId,
      assembly: { materialInstanceIds: s.state.players[0]!.trash.map((c) => c.instanceId) },
    }),
  ).toEqual({ ok: true });
  await resolved(s, "EX13-016");
  expect(field(s, "ST20-11")).toBeDefined();
  expect(field(s, "ST21-11")).toBeDefined();
  expect(field(s, "EX13-016").stack).toHaveLength(4);
  await finish(run);
});
it("#4986 a new link occurrence offers Dantemon alongside Tellermon before returning to older pending effects", async () => {
  const declinePrompts = ["Attack", "Battle"];
  const run = await start("arena-issue-4981-dantemon-seven-code", {
    autoOrderTriggers: false,
    declinePrompts,
  });
  const { s } = run;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT26-102").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const initial = s.decisions.at(-1)!.req;
  const copipe = initial.options!.triggerKeys![initial.options!.triggerCardIds!.indexOf("BT26-084")]!;
  expect(copipe).toBeDefined();
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: initial.decisionId,
      response: { kind: "orderTriggers", order: [copipe] },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.pendingDecision?.kind === "orderTriggers" && s.state.pendingDecision.decisionId !== initial.decisionId,
  );
  const nested = s.decisions.at(-1)!.req;
  expect(nested.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT26-086", "BT26-063"]));
  // The link selection has finished; the next Dantemon selector is its optional deletion.
  declinePrompts.push("Dantemon");
  for (let i = 0; i < 30; i++) {
    await settle();
    if (s.state.pendingDecision?.kind !== "orderTriggers") break;
    const pending = s.decisions.at(-1)!.req;
    const ids = pending.options!.triggerCardIds!;
    const index = ids.indexOf("BT26-086");
    expect(
      s.engine.applyIntent(pending.seat as Seat, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [pending.options!.triggerKeys![index < 0 ? 0 : index]!] },
      }),
    ).toEqual({ ok: true });
  }
  await main1(s);
  expect(s.state.players[1]!.security).toHaveLength(4);
  expect(Boolean(field(s, "BT1-084", 1))).toBe(true);
  expect(field(s, "BT26-086").linked).toHaveLength(7);
  await finish(run);
});
it("#4971 Imperialdramon reacts to Dracomon X's derived effect evolution before the pending normal evolution", async () => {
  const run = await start("arena-issue-4971-imperial-effect-evolution");
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "EX13-008").permanentId,
      instanceId: hand(s, "BT21-046").instanceId,
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.pendingDecision === undefined && s.state.players[0]!.deck.some((c) => c.cardId === "EX13-018"),
  );
  expect(Boolean(field(s, "EX13-018"))).toBe(false);
  expect(
    s.decisions.filter(
      (d) =>
        d.req.sourceCardId === "AD1-024" &&
        d.req.kind === "optional" &&
        d.req.promptText === "Activate this triggered effect?",
    ),
  ).toHaveLength(1);
  await finish(run);
});
