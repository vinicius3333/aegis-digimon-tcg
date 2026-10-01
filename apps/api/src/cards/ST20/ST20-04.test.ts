import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST20-04.js";
import "./ST20-07.js";

describe("ST20-04 Garudamon", () => {
  it("inherits Alliance and resolves the ally cost across two security checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-10", as: "host", under: ["ST20-04"] },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { security: ["ST1-11", "ST1-11"], deck: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    const host = s.perm("host");
    const ally = s.perm("ally");
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(true);
    expect(ally.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("grants Security Attack +1 and +2000 DP per two Tamer colors on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-07", as: "target" },
            { card: "ST20-12", as: "twoColorTamer" },
            { card: "BT21-102", as: "oneColorTamer" },
          ],
          hand: [{ card: "ST20-04", as: "garudamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP + 2000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });

  it("does not scale DP when no Tamer colors are present, while still granting Security Attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-07", as: "target" }],
          hand: [{ card: "ST20-04", as: "garudamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });

  it("grants Alliance and opens the optional attack after another Adventure is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST20-04", as: "garudamon" }], hand: [{ card: "ST20-07", as: "played" }] },
        1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-003", "BT1-004"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    const combat = (
      s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean; allianceDecisionPermanentId?: string } }
    ).combat;
    await settle(() => {
      const pending = s.state.pendingDecision;
      if (pending?.kind === "optional")
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: true },
        });
      return combat.hasOpenAllianceDecision;
    });
    const attackerId = combat.allianceDecisionPermanentId;
    const allyId =
      attackerId === s.perm("garudamon").permanentId ? s.perm("played").permanentId : s.perm("garudamon").permanentId;
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: allyId } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === allyId)?.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

type GarudamonSetup = ReturnType<typeof setupEngine>;

function setupGarudamonTurn(playedCardId: string) {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "ST20-04", as: "source" },
        { card: "BT1-009", as: "attacker" },
      ],
      hand: [{ card: playedCardId, as: "played" }],
      deck: ["ST1-02", "ST2-02"],
    },
    1: { security: ["BT1-001"], deck: ["ST1-02", "ST2-02"] },
  });
  s.state.memory = 10;
  return s;
}

async function nextDecision(s: GarudamonSetup) {
  await settle(() => s.state.pendingDecision !== undefined);
  const request = s.decisions.at(-1)!.req;
  expect(request.decisionId).toBe(s.state.pendingDecision!.decisionId);
  return request;
}

function respondWithPermanent(
  s: GarudamonSetup,
  request: { decisionId: string; options?: { candidateInstanceIds?: string[] } },
  alias: string,
) {
  const permanent = s.perm(alias);
  const candidate = (request.options?.candidateInstanceIds ?? []).find(
    (id) => id === permanent.permanentId || id === permanent.topCard.instanceId,
  );
  expect(candidate, `${alias} is offered`).toBeDefined();
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "chooseTargets", instanceIds: [candidate!] },
    }),
  ).toEqual({ ok: true });
}

function respondOptional(s: GarudamonSetup, decisionId: string, accept: boolean) {
  expect(
    s.engine.applyIntent(0, { type: "respondDecision", decisionId, response: { kind: "optional", accept } }),
  ).toEqual({ ok: true });
}

async function declareEffectAttack(s: GarudamonSetup, attackerAlias: string) {
  const attackOffer = await nextDecision(s);
  expect(attackOffer).toMatchObject({ kind: "optional", sourceCardId: "ST20-04", promptText: "Attack with a Digimon" });
  respondOptional(s, attackOffer.decisionId, true);
  const attackerChoice = await nextDecision(s);
  expect(attackerChoice.options?.selectionContext).toBe("attackSource");
  respondWithPermanent(s, attackerChoice, attackerAlias);
  const targetChoice = await nextDecision(s);
  expect(targetChoice.options?.selectionContext).toBe("attackTarget");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: targetChoice.decisionId,
      response: { kind: "selectCards", instanceIds: ["player"] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some(({ kind }) => kind === "attackDeclared"));
}

function declaredAttackers(s: GarudamonSetup) {
  return s.events.flatMap((event) => (event.kind === "attackDeclared" ? [event.attackerPermanentId] : []));
}

describe("ST20-04 Garudamon — KB Q&A rulings", () => {
  it("must give <Alliance> to 1 Digimon when an [ADVENTURE] Digimon is played, even when declining every optional prompt (Q4445)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-04", as: "source" }],
          hand: [{ card: "ST20-07", as: "played" }],
          deck: ["ST1-02", "ST2-02"],
        },
        1: { security: ["BT1-001"], deck: ["ST1-02", "ST2-02"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-04") &&
        s.state.pendingDecision === undefined,
    );

    const sourceRequests = s.decisions.filter(({ req }) => req.sourceCardId === "ST20-04").map(({ req }) => req);
    const allianceChoice = sourceRequests.find(
      (req) => req.kind === "chooseTargets" && req.options?.selectionContext !== "attackSource",
    );
    expect(allianceChoice?.options?.min).toBe(1);
    expect(sourceRequests.filter((req) => req.kind === "optional").map((req) => req.promptText)).toEqual([
      "Attack with a Digimon",
    ]);
    const permanents = Array.from(s.state.players[0]!.battleArea);
    expect(permanents.filter((permanent) => observe(s.engine).hasKeyword(permanent, "Alliance"))).toHaveLength(1);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("can give <Alliance> to one Digimon and attack with a different one (Q4446)", async () => {
    const s = setupGarudamonTurn("ST20-07");
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    const allianceChoice = await nextDecision(s);
    expect(allianceChoice).toMatchObject({ kind: "chooseTargets", sourceCardId: "ST20-04" });
    respondWithPermanent(s, allianceChoice, "source");
    await declareEffectAttack(s, "attacker");

    expect(declaredAttackers(s)).toEqual([s.perm("attacker").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Alliance")).toBe(false);
  });

  it("can decline the attack after giving <Alliance> and keep the <Alliance> grant (Q4447)", async () => {
    const s = setupGarudamonTurn("ST20-07");
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    const allianceChoice = await nextDecision(s);
    respondWithPermanent(s, allianceChoice, "attacker");
    const attackOffer = await nextDecision(s);
    expect(attackOffer).toMatchObject({
      kind: "optional",
      sourceCardId: "ST20-04",
      promptText: "Attack with a Digimon",
    });
    respondOptional(s, attackOffer.decisionId, false);
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Alliance")).toBe(true);
    expect(declaredAttackers(s)).toEqual([]);
    expect(s.perm("attacker").isSuspended).toBe(false);
  });

  it("still lets 1 Digimon attack when the played Digimon lacks the [ADVENTURE] trait (Q4693)", async () => {
    const s = setupGarudamonTurn("BT1-010");
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await declareEffectAttack(s, "attacker");

    expect(declaredAttackers(s)).toEqual([s.perm("attacker").permanentId]);
    expect(
      s.decisions.some(
        ({ req }) =>
          req.sourceCardId === "ST20-04" &&
          req.kind === "chooseTargets" &&
          req.options?.selectionContext !== "attackSource",
      ),
    ).toBe(false);
    const permanents = Array.from(s.state.players[0]!.battleArea);
    expect(permanents.some((permanent) => observe(s.engine).hasKeyword(permanent, "Alliance"))).toBe(false);
  });
});
