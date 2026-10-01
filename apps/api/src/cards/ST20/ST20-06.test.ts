import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("ST20-06 Angewomon", () => {
  it.each([
    ["ST20-07", true],
    ["BT1-010", false],
  ] as const)(
    "gates the Alliance grant on played card %s while allowing attack refusal",
    async (cardId, grantsAlliance) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST20-06", as: "source" }],
            hand: [{ card: cardId, as: "played" }],
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
          s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-06") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-06")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(grantsAlliance);
      expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
      await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
      await advance(s.engine).runTurn(0);
      expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(false);
    },
  );

  it("grants Alliance after another Digimon evolves into ADVENTURE even when the attack is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-06", as: "source" },
            { card: "ST20-07", as: "base" },
          ],
          hand: [{ card: "ST20-08", as: "next" }],
          deck: ["ST1-02", "ST2-02"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("next").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.instanceId === s.inst("next").instanceId &&
        s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-06") &&
        s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("inherits Alliance and resolves the ally cost across two security checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-10", as: "host", under: ["ST20-06"] },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { security: ["ST1-11", "ST1-11"], deck: ["ST1-02", "ST2-02"] },
      },
      { autoSelectCards: true },
    );
    const host = s.perm("host");
    const ally = s.perm("ally");
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    const combat = (
      s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean; hasOpenBlockWindow: boolean } }
    ).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(true);
    expect(ally.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("may free-digivolve one other Digimon into an Adventure card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-08", as: "other" }],
          hand: [
            { card: "ST20-06", as: "angewomon" },
            { card: "ST20-09", as: "next" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angewomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("other").topCard?.instanceId === s.inst("next").instanceId);
  });

  it("grants Alliance and resolves its optional attack after an Adventure is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST20-06", as: "angewomon" }], hand: [{ card: "ST20-07", as: "played" }] },
        1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-003", "BT1-004"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("ST20-06");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    const combat = (
      s.engine as unknown as {
        combat: { hasOpenAllianceDecision: boolean; allianceDecisionPermanentId?: string; isAttacking: boolean };
      }
    ).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(combat.allianceDecisionPermanentId).toBe(s.perm("angewomon").permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("played").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !combat.isAttacking && s.state.players[1]!.security.length === 0);
    expect(s.perm("played").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

type AngewomonSetup = ReturnType<typeof setupEngine>;

function setupAngewomonTurn(playedCardId: string) {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "ST20-06", as: "angewomon" },
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

async function nextDecision(s: AngewomonSetup) {
  await settle(() => s.state.pendingDecision !== undefined);
  const request = s.decisions.at(-1)!.req;
  expect(request.decisionId).toBe(s.state.pendingDecision!.decisionId);
  return request;
}

function respondWithPermanent(
  s: AngewomonSetup,
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

function respondOptional(s: AngewomonSetup, decisionId: string, accept: boolean) {
  expect(
    s.engine.applyIntent(0, { type: "respondDecision", decisionId, response: { kind: "optional", accept } }),
  ).toEqual({ ok: true });
}

async function declareEffectAttack(s: AngewomonSetup, attackerAlias: string) {
  const attackOffer = await nextDecision(s);
  expect(attackOffer).toMatchObject({ kind: "optional", sourceCardId: "ST20-06", promptText: "Attack with a Digimon" });
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

function declaredAttackers(s: AngewomonSetup) {
  return s.events.flatMap((event) => (event.kind === "attackDeclared" ? [event.attackerPermanentId] : []));
}

describe("ST20-06 Angewomon — KB Q&A rulings", () => {
  it("must give <Alliance> to 1 Digimon when an [ADVENTURE] Digimon is played, even when declining every optional prompt (Q4448)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-06", as: "angewomon" }],
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
        s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-06") &&
        s.state.pendingDecision === undefined,
    );

    const angewomonRequests = s.decisions.filter(({ req }) => req.sourceCardId === "ST20-06").map(({ req }) => req);
    const allianceChoice = angewomonRequests.find(
      (req) => req.kind === "chooseTargets" && req.options?.selectionContext !== "attackSource",
    );
    expect(allianceChoice?.options?.min).toBe(1);
    expect(angewomonRequests.filter((req) => req.kind === "optional").map((req) => req.promptText)).toEqual([
      "Attack with a Digimon",
    ]);
    const permanents = Array.from(s.state.players[0]!.battleArea);
    expect(permanents.filter((permanent) => observe(s.engine).hasKeyword(permanent, "Alliance"))).toHaveLength(1);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("can give <Alliance> to one Digimon and attack with a different one (Q4449)", async () => {
    const s = setupAngewomonTurn("ST20-07");
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    const allianceChoice = await nextDecision(s);
    expect(allianceChoice).toMatchObject({ kind: "chooseTargets", sourceCardId: "ST20-06" });
    respondWithPermanent(s, allianceChoice, "angewomon");
    await declareEffectAttack(s, "attacker");

    expect(declaredAttackers(s)).toEqual([s.perm("attacker").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("angewomon"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Alliance")).toBe(false);
  });

  it("can decline the attack after giving <Alliance> and keep the <Alliance> grant (Q4450)", async () => {
    const s = setupAngewomonTurn("ST20-07");
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    const allianceChoice = await nextDecision(s);
    respondWithPermanent(s, allianceChoice, "attacker");
    const attackOffer = await nextDecision(s);
    expect(attackOffer).toMatchObject({
      kind: "optional",
      sourceCardId: "ST20-06",
      promptText: "Attack with a Digimon",
    });
    respondOptional(s, attackOffer.decisionId, false);
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Alliance")).toBe(true);
    expect(declaredAttackers(s)).toEqual([]);
    expect(s.perm("attacker").isSuspended).toBe(false);
  });

  it("still lets 1 Digimon attack when the played Digimon lacks the [ADVENTURE] trait (Q4694)", async () => {
    const s = setupAngewomonTurn("BT1-010");
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await declareEffectAttack(s, "attacker");

    expect(declaredAttackers(s)).toEqual([s.perm("attacker").permanentId]);
    expect(
      s.decisions.some(
        ({ req }) =>
          req.sourceCardId === "ST20-06" &&
          req.kind === "chooseTargets" &&
          req.options?.selectionContext !== "attackSource",
      ),
    ).toBe(false);
    const permanents = Array.from(s.state.players[0]!.battleArea);
    expect(permanents.some((permanent) => observe(s.engine).hasKeyword(permanent, "Alliance"))).toBe(false);
  });
});
