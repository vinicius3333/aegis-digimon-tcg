import { EffectDuration, getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-036.js";
import "./EX3-069.js";

interface SelectionPayload {
  candidateInstanceIds?: string[];
  visibleInstanceIds?: string[];
  min?: number;
  max?: number;
  timing?: string;
  effectText?: string;
}

function payload(s: EngineSetup): SelectionPayload {
  return s.decisions.at(-1)!.req.options as SelectionPayload;
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  const decision = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(decision.seat, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-036 Magnadramon", () => {
  it("has the official metadata, digivolves for 4, and plays for 12", async () => {
    expect(getCardDefinition("EX3-036")).toMatchObject({
      cardId: "EX3-036",
      nameEn: "Magnadramon",
      colors: ["Yellow"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Dragon", "Four Great Dragons"],
      rarity: "R",
      imageId: "EX3-036-Errata",
    });

    const evolution = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "base" }],
        hand: [{ card: "EX3-036", as: "magnadramon" }],
        deck: ["BT1-001"],
      },
    });
    evolution.state.memory = 4;
    await evolution.ready();
    expect(
      evolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolution.perm("base").permanentId,
        instanceId: evolution.inst("magnadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolution.perm("base").topCard.cardId === "EX3-036");
    expect(evolution.state.memory).toBe(0);

    const play = setupEngine({ 0: { hand: [{ card: "EX3-036", as: "magnadramon" }] } });
    play.state.memory = 12;
    await play.ready();
    expect(play.engine.applyIntent(0, { type: "playCard", instanceId: play.inst("magnadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => play.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-036"));
    expect(play.state.memory).toBe(0);
  });

  it("Four Great Dragons family: gives every opponent Digimon Security Attack -1 on a non-Trial play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-053", as: "ownDigimon" }],
        hand: [{ card: "EX3-036", as: "magnadramon" }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "firstOpponent" },
          { card: "BT1-011", as: "secondOpponent" },
        ],
        deck: ["BT1-003", "BT1-004"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("magnadramon").instanceId]);
    await settle(() => observe(s.engine).keywordAmount(s.perm("firstOpponent"), "SecurityAttack") === -1);

    expect(observe(s.engine).keywordAmount(s.perm("firstOpponent"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("secondOpponent"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("ownDigimon"), "SecurityAttack")).toBe(0);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("firstOpponent"), "SecurityAttack")).toBe(-1);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("firstOpponent"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("secondOpponent"), "SecurityAttack")).toBe(0);
  });

  it("uses play provenance to apply Security Attack -2 when Trial plays Magnadramon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-069", as: "trial" },
            { card: "EX3-036", as: "magnadramon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstOpponent" },
            { card: "BT1-011", as: "secondOpponent" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("trial").instanceId);
    const trial = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-069")!;
    s.state.turnCount += 1;
    await advance(s.engine).recompute();
    const entries = JSON.parse(trial.activatableEffectsJson || "[]") as Array<{
      instanceId: string;
      effectKey: string;
      description: string;
    }>;
    const delay = entries.find(({ description }) => /Delay/i.test(description));
    expect(delay).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: trial.topCard.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("firstOpponent"), "SecurityAttack") === -2 &&
        s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-069"),
    );

    expect(observe(s.engine).keywordAmount(s.perm("firstOpponent"), "SecurityAttack")).toBe(-2);
    expect(observe(s.engine).keywordAmount(s.perm("secondOpponent"), "SecurityAttack")).toBe(-2);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX3-069");
  });

  it("Security Attack -1 reduces a +1 attacker to exactly 1 check", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX3-036", as: "magnadramon" }],
        security: ["BT1-001", "BT1-002"],
      },
      1: { battleArea: [{ card: "BT1-028", dp: 10000, as: "attacker" }] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    advance(s.engine).ledgers.continuous.addKeywordGrant(attackerId, "SecurityAttack", EffectDuration.Permanent, 1);
    await advance(s.engine).verb.playInstances([s.inst("magnadramon").instanceId]);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("Trial's Security Attack -2 reduces a +1 attacker to 0 checks", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX3-036", as: "magnadramon" }],
        security: ["BT1-001", "BT1-002"],
      },
      1: { battleArea: [{ card: "BT1-028", dp: 10000, as: "attacker" }] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    advance(s.engine).ledgers.continuous.addKeywordGrant(attackerId, "SecurityAttack", EffectDuration.Permanent, 1);
    await advance(s.engine).verb.playInstances([s.inst("magnadramon").instanceId], "EX3-069");
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("snapshots current opposing Digimon and does not debuff a later entrant", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-036", as: "magnadramon" }] },
      1: {
        battleArea: [{ card: "BT1-028", as: "existing" }],
        hand: [{ card: "BT1-029", as: "entrant" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("magnadramon").instanceId]);
    await advance(s.engine).verb.playInstances([s.inst("entrant").instanceId]);
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-029"));
    const entrant = s.state.players[1]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("entrant").instanceId,
    )!;

    expect(observe(s.engine).keywordAmount(s.perm("existing"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(entrant, "SecurityAttack")).toBe(0);
  });

  it("an effect other than Trial still applies only Security Attack -1", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-036", as: "magnadramon" }] },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("magnadramon").instanceId], "EX3-035");
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -1);

    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("multiple copies apply independent cumulative modifiers", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX3-036", as: "first" },
          { card: "EX3-036", as: "second" },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("first").instanceId]);
    await advance(s.engine).verb.playInstances([s.inst("second").instanceId]);
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -2);

    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-2);
  });

  it("Q3412 places Trial after deletion without activating Trial's Main draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-036", as: "magnadramon" }],
          hand: [{ card: "EX3-069", as: "trial" }],
          deck: [{ card: "BT1-001", as: "wouldBeMainDraw" }, "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("magnadramon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-069");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("wouldBeMainDraw").instanceId,
    );
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-036" && req.kind === "optional")).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-036" && req.kind === "selectCards")).toHaveLength(
      0,
    );
    const trial = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-069")!;
    expect(observe(s.engine).activatableEffects(trial)).toEqual([]);
  });

  it("offers one optional activation and then exactly the Trial cards from hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-036", as: "magnadramon" }],
        hand: [
          { card: "EX3-069", as: "firstTrial" },
          { card: "EX3-069", as: "secondTrial" },
          { card: "BT1-010", as: "filler" },
        ],
      },
    });
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("magnadramon").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-036",
      options: {
        timing: "OnDeletion",
        effectText: expect.stringContaining("may place 1 [Trial of the Four Great Dragons]"),
      },
    });
    respond(s, { kind: "optional", accept: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-036",
      options: {
        candidateInstanceIds: expect.arrayContaining([
          s.inst("firstTrial").instanceId,
          s.inst("secondTrial").instanceId,
        ]),
        visibleInstanceIds: expect.arrayContaining([
          s.inst("firstTrial").instanceId,
          s.inst("secondTrial").instanceId,
          s.inst("filler").instanceId,
        ]),
        timing: "OnDeletion",
        effectText: expect.stringContaining("may place 1 [Trial of the Four Great Dragons]"),
        min: 1,
        max: 1,
      },
    });
    expect(payload(s).candidateInstanceIds).toHaveLength(2);
    expect(payload(s).candidateInstanceIds).not.toContain(s.inst("filler").instanceId);
    respond(s, { kind: "selectCards", instanceIds: [s.inst("secondTrial").instanceId] });
    await deletion;
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("secondTrial").instanceId),
    );

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-036" && req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstTrial").instanceId, s.inst("filler").instanceId]),
    );
  });

  it("does not offer deletion placement without a Trial in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-036", as: "magnadramon" }],
        hand: [{ card: "BT1-010", as: "filler" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("magnadramon").permanentId], "byEffect");
    await settle();

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-036")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("filler").instanceId);
  });

  it("places Trial after Magnadramon is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-028", dp: 13000, as: "attacker" }] },
        1: {
          battleArea: [{ card: "EX3-036", suspended: true, as: "magnadramon" }],
          hand: [{ card: "EX3-069", as: "trial" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("magnadramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069"));

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("EX3-036");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-069");
  });

  it("honors the deletion errata's optional decline with no second confirmation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-036", as: "magnadramon" }],
          hand: [{ card: "EX3-069", as: "trial" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("magnadramon").permanentId], "byEffect");
    await settle(() => s.decisions.some(({ req }) => req.sourceCardId === "EX3-036" && req.kind === "optional"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("trial").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-036" && req.kind === "optional")).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-036" && req.kind === "selectCards")).toHaveLength(
      0,
    );
  });

  it("does not offer deletion placement when Trial is already in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-036", as: "magnadramon" }],
        hand: [
          { card: "EX3-069", as: "existingTrial" },
          { card: "EX3-069", as: "secondTrial" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("existingTrial").instanceId);

    await advance(s.engine).verb.deletePermanent([s.perm("magnadramon").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("secondTrial").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-036")).toHaveLength(0);
  });
});
