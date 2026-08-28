import { EffectDuration, getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-032.js";

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

const nonSovereignScenarios: Array<[string, { own?: string; opponent?: string }]> = [
  ["the opponent controls Four Sovereigns", { opponent: "EX3-025" }],
  ["only an allied Four Great Dragons Digimon is present", { own: "EX3-036" }],
  ["only an allied Deva Digimon is present", { own: "EX3-032" }],
];

describe("EX3-032 Majiramon", () => {
  it("has the official identity and digivolves from a yellow level 4 for 3", async () => {
    expect(getCardDefinition("EX3-032")).toMatchObject({
      cardId: "EX3-032",
      nameEn: "Majiramon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Holy Dragon", "Deva"],
      rarity: "C",
      imageId: "EX3-032",
    });

    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-031", as: "base" }],
        hand: [{ card: "EX3-032", as: "majiramon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("majiramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-032");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("Deva/Four Sovereigns family: targets exactly 1 opponent Digimon and gains 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-025", as: "fourSovereigns" }],
        hand: [{ card: "EX3-032", as: "majiramon" }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "chosen" },
          { card: "BT1-011", as: "unchosen" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const choice = s.state.pendingDecision!;
    const choicePayload = JSON.parse(choice.payloadJson) as {
      candidateInstanceIds?: string[];
      min?: number;
      max?: number;
    };
    expect(choicePayload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("chosen").permanentId, s.perm("unchosen").permanentId]),
    );
    expect(choicePayload.candidateInstanceIds).not.toContain(s.perm("fourSovereigns").permanentId);
    expect(choicePayload).toMatchObject({ min: 1, max: 1 });
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-032",
      options: {
        timing: "OnPlay",
        effectText: expect.stringContaining("1 of your opponent's Digimon gains"),
        candidateInstanceIds: expect.arrayContaining([s.perm("chosen").permanentId, s.perm("unchosen").permanentId]),
        min: 1,
        max: 1,
      },
    });
    expect((s.decisions.at(-1)!.req.options as { effectText?: string }).effectText).toContain(
      "If you have a Digimon with [Four Sovereigns] in its traits in play, gain 2 memory.",
    );
    respond(s, { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] });
    await settle(
      () => s.state.memory === 5 && observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack") === -2,
    );

    expect(s.state.memory).toBe(5);
    expect(observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack")).toBe(-2);
    expect(observe(s.engine).keywordAmount(s.perm("unchosen"), "SecurityAttack")).toBe(0);
  });

  it("Security Attack -2 reduces a Security Attack +1 attacker to 0 real checks", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX3-032", as: "majiramon" }],
        security: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [
          { card: "BT1-028", dp: 10000, as: "attacker" },
          { card: "BT1-010", as: "bystander" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    advance(s.engine).ledgers.continuous.addKeywordGrant(attackerId, "SecurityAttack", EffectDuration.Permanent, 1);

    const play = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("majiramon").instanceId,
    });
    expect(play).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    respond(s, { kind: "chooseTargets", instanceIds: [attackerId] });
    await settle(() => observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack") === -1);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("keeps Security Attack -2 through the opponent's turn and expires it at that turn's end", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-032", as: "majiramon" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target" }],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -2);
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("does not gain memory when Four Sovereigns exists only in a digivolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-053", under: [{ card: "EX3-025" }], as: "unrelatedTop" }],
          hand: [{ card: "EX3-032", as: "majiramon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -2);

    expect(s.state.memory).toBe(3);
  });

  it.each(nonSovereignScenarios)("does not gain memory when %s", async (_label, enabler) => {
    const s = setupEngine(
      {
        0: {
          battleArea: enabler.own === undefined ? [] : [{ card: enabler.own, as: "similar" }],
          hand: [{ card: "EX3-032", as: "majiramon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target" },
            ...(enabler.opponent === undefined ? [] : [{ card: enabler.opponent, as: "opposingSovereign" }]),
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -2);

    expect(s.state.memory).toBe(3);
  });

  it("snapshots the selected Digimon and does not debuff a later opposing entrant", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-032", as: "majiramon" }] },
      1: {
        battleArea: [
          { card: "BT1-028", as: "selected" },
          { card: "BT1-010", as: "unselected" },
        ],
        hand: [{ card: "BT1-029", as: "entrant" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    respond(s, { kind: "chooseTargets", instanceIds: [s.perm("selected").permanentId] });
    await settle(() => observe(s.engine).keywordAmount(s.perm("selected"), "SecurityAttack") === -2);
    await advance(s.engine).verb.playInstances([s.inst("entrant").instanceId]);
    const entrant = s.state.players[1]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("entrant").instanceId,
    )!;

    expect(observe(s.engine).keywordAmount(s.perm("selected"), "SecurityAttack")).toBe(-2);
    expect(observe(s.engine).keywordAmount(entrant, "SecurityAttack")).toBe(0);
  });

  it("multiple copies apply independent cumulative Security Attack modifiers", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-032", as: "first" },
            { card: "EX3-032", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 14;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -2);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -4);

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-4);
    expect(s.state.memory).toBe(0);
  });

  it("still gains the conditional memory when the opponent has no Digimon to debuff", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-025", as: "fourSovereigns" }],
        hand: [{ card: "EX3-032", as: "majiramon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 5);

    expect(s.state.memory).toBe(5);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-032")).toHaveLength(0);
  });
});
