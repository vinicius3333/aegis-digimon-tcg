import { effectiveCopyLimit, getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./EX3-057.js";

interface DecisionPayload {
  candidateInstanceIds?: string[];
  min?: number;
  max?: number;
  timing?: string;
  effectText?: string;
}

function payload(s: EngineSetup): DecisionPayload {
  return JSON.parse(s.state.pendingDecision!.payloadJson) as DecisionPayload;
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  expect(
    s.engine.applyIntent(s.state.pendingDecision!.seat, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-057 Growlmon", () => {
  it("matches the official errata metadata and evolves from Guilmon for 2", async () => {
    const definition = getCardDefinition("EX3-057")!;
    expect(definition).toMatchObject({
      cardId: "EX3-057",
      colors: ["Purple", "Red"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
      rarity: "C",
      imageId: "EX3-057-Errata",
      maxCountInDeck: 4,
    });
    expect(definition.effectText).toBe(
      "Digivolve: 2 if name contains [Guilmon][When Digivolving] Delete 1 of your opponent's Digimon with 3000 DP or less. If no Digimon is deleted by this effect, trash the top 2 cards of both players' decks.",
    );
    expect(definition.inheritedEffectText).toBe(
      "[When Attacking][Once Per Turn] By deleting 1 of your other Digimon, this Digimon gains ＜Security Attack +1＞ for the turn. (This Digimon checks 1 additional security card.)",
    );
    expect(definition.evoCosts).toEqual([{ color: "Purple", level: 3, memoryCost: 3 }]);
    expect(definition.effectText).toContain("[When Digivolving]");
    expect(definition.effectText).not.toContain("[On Deletion]");
    expect(definition.inheritedEffectText).toContain("By deleting 1 of your other Digimon");
    expect(effectiveCopyLimit("EX3-057")).toBe(1);

    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-056", as: "guilmon" }],
        hand: [{ card: "EX3-057", as: "growlmon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { deck: ["BT1-012", "BT1-013", "BT1-014"] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.cardId === "EX3-057" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.perm("guilmon").stack.map(({ cardId }) => cardId)).toContain("EX3-056");
  });

  it("uses the printed cost 3 from a purple level 3 that is not Guilmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-071", as: "purpleBase" }],
        hand: [{ card: "EX3-057", as: "growlmon" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleBase").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleBase").topCard.cardId === "EX3-057" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
  });

  it("errata When Digivolving deletes exactly 1 eligible opponent and does not mill", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-056", as: "base" }],
        hand: [{ card: "EX3-057", as: "growlmon" }],
        deck: [
          { card: "BT1-009", as: "ownTop" },
          { card: "BT1-010", as: "ownSecond" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "eligible" },
          { card: "EX3-056", as: "boundary" },
          { card: "BT1-014", as: "tooLarge" },
        ],
        deck: [
          { card: "BT1-011", as: "opponentTop" },
          { card: "BT1-012", as: "opponentSecond" },
        ],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const eligibleInstanceId = s.perm("eligible").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-057",
      options: { timing: "WhenDigivolving", min: 1, max: 1 },
    });
    expect(payload(s).candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("eligible").permanentId, s.perm("boundary").permanentId]),
    );
    expect(payload(s).candidateInstanceIds).not.toContain(s.perm("tooLarge").permanentId);
    expect(payload(s).effectText).toContain("[When Digivolving]");
    respond(s, { kind: "chooseTargets", instanceIds: [s.perm("eligible").permanentId] });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === eligibleInstanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("ownTop").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("ownSecond").instanceId]);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("opponentTop").instanceId,
      s.inst("opponentSecond").instanceId,
    ]);
  });

  it("mills up to 2 cards from both decks when When Digivolving deletes nothing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-056", as: "base" }],
        hand: [{ card: "EX3-057", as: "growlmon" }],
        deck: [
          { card: "BT1-009", as: "ownTop" },
          { card: "BT1-010", as: "ownSecond" },
          { card: "BT1-011", as: "ownThird" },
          { card: "BT1-012", as: "ownRemaining" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-014", as: "tooLarge" }],
        deck: [{ card: "BT1-013", as: "onlyOpponentCard" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.length === 1 &&
        s.state.players[1]!.deck.length === 0,
    );

    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("ownRemaining").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("ownSecond").instanceId, s.inst("ownThird").instanceId]),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("onlyOpponentCard").instanceId,
    );
  });

  it("Virus-family attack pays the inherited cost and checks 2 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-020", under: ["EX3-057"], as: "virusHost" },
          { card: "ST7-03", as: "virusCost" },
          { card: "BT10-071", as: "secondCost" },
        ],
        deck: Array.from({ length: 10 }, () => "BT1-009"),
      },
      1: {
        hand: [{ card: "BT1-010", as: "opponentCard" }],
        security: ["BT1-090", "BT1-091", "BT1-092"],
        deck: Array.from({ length: 10 }, () => "BT1-010"),
      },
    });
    await s.ready();
    expect(s.perm("virusHost").stack.map(({ cardId }) => cardId)).toEqual(["EX3-057"]);
    const costInstanceId = s.perm("virusCost").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("virusHost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-057",
      options: { timing: "WhenAttacking" },
    });
    expect(payload(s).effectText).toContain("By deleting 1 of your other Digimon");
    respond(s, { kind: "optional", accept: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(payload(s)).toMatchObject({ min: 1, max: 1, timing: "WhenAttacking" });
    expect(payload(s).candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("virusCost").permanentId, s.perm("secondCost").permanentId]),
    );
    expect(payload(s).candidateInstanceIds).not.toContain(s.perm("virusHost").permanentId);
    respond(s, { kind: "chooseTargets", instanceIds: [s.perm("virusCost").permanentId] });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.security.length === 1 &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === costInstanceId),
    );

    expect(observe(s.engine).keywordAmount(s.perm("virusHost"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("secondCost").permanentId,
    );
  });

  it("can decline the inherited attack effect without deleting another Digimon or gaining Security Attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-020", under: ["EX3-057"], as: "host" },
          { card: "ST7-03", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    respond(s, { kind: "optional", accept: false });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("other").permanentId);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-057")).toHaveLength(1);
  });

  it("does not offer the inherited effect when no other Digimon can pay its deletion cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-020", under: ["EX3-057"], as: "onlyHost" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("onlyHost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-057")).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("onlyHost"), "SecurityAttack")).toBe(0);
  });
});
