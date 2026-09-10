import { effectiveStaticNames, getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX3-064.js";
import "./EX3-069.js";
import "./EX3-025.js";

function respond(s: EngineSetup, response: DecisionResponse): void {
  expect(
    s.engine.applyIntent(s.state.pendingDecision!.seat, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

function delayEntry(permanent: { activatableEffectsJson?: string }): { effectKey: string } | undefined {
  const entries = JSON.parse(permanent.activatableEffectsJson || "[]") as Array<{
    effectKey: string;
    description: string;
  }>;
  return entries.find(({ description }) => /Delay/i.test(description));
}

describe("EX3-064 Megidramon", () => {
  it("matches the official errata identity and is always also ChaosGallantmon", async () => {
    const definition = getCardDefinition("EX3-064")!;
    expect(definition).toMatchObject({
      cardId: "EX3-064",
      nameEn: "Megidramon",
      colors: ["Purple"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Evil Dragon", "Four Great Dragons"],
      rarity: "R",
      imageId: "EX3-064-Errata",
    });
    expect(effectiveStaticNames(definition)).toEqual(expect.arrayContaining(["Megidramon", "ChaosGallantmon"]));
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Rule",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "name",
              tokens: ["ChaosGallantmon"],
            },
          ],
        },
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
                count: 1,
              },
              condition: { kind: "not", condition: { kind: "triggerPlayedByEffectSource", sourceCardId: "EX3-069" } },
            },
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
                count: 1,
              },
              condition: { kind: "triggerPlayedByEffectSource", sourceCardId: "EX3-069" },
            },
          ],
        },
        {
          trigger: "OnDeletion",
          actions: [
            {
              kind: "PlaceInBattleAreaSelf",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Trial of the Four Great Dragons"], match: "name" }],
                  zone: "hand",
                },
                count: 1,
              },
              from: ["hand"],
              optional: true,
              condition: {
                kind: "youHaveNone",
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Trial of the Four Great Dragons"], match: "name" }],
                  zone: "battleArea",
                },
              },
            },
          ],
        },
      ],
    });

    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-064", as: "megidramon" }] } });
    await s.ready();
    expect(observe(s.engine).effectiveNames(s.perm("megidramon"))).toEqual(
      expect.arrayContaining(["megidramon", "chaosgallantmon"]),
    );
    assertNoLoudGap(s);
  });

  it("digivolves from purple level 5 for 4 and rejects a red level 5 source", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT10-079", under: ["BT1-010"], as: "purpleLevel5" }],
        hand: [{ card: "EX3-064", as: "megidramon" }],
      },
    });
    legal.state.memory = 4;
    await legal.ready();

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("purpleLevel5").permanentId,
        instanceId: legal.inst("megidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("purpleLevel5").topCard.cardId === "EX3-064");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("purpleLevel5").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT10-079"]);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "redLevel5" }],
        hand: [{ card: "EX3-064", as: "megidramon" }],
      },
    });
    invalid.state.memory = 4;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redLevel5").permanentId,
        instanceId: invalid.inst("megidramon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.state.memory).toBe(4);
    expect(invalid.perm("redLevel5").topCard.cardId).toBe("BT1-021");
    expect(invalid.inst("megidramon").cardId).toBe("EX3-064");
  });

  it("on an ordinary play deletes level 5 but never offers level 6", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-064", as: "megidramon" }] },
      1: {
        battleArea: [
          { card: "BT1-020", as: "level5" },
          { card: "BT1-021", as: "otherLevel5" },
          { card: "BT1-025", as: "level6" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const payload = JSON.parse(s.state.pendingDecision!.payloadJson) as { candidateInstanceIds: string[] };
    expect(payload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("level5").permanentId, s.perm("otherLevel5").permanentId]),
    );
    expect(payload.candidateInstanceIds).not.toContain(s.perm("level6").permanentId);
    respond(s, { kind: "chooseTargets", instanceIds: [s.perm("level5").permanentId] });
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("level6").permanentId,
    );
    assertNoLoudGap(s);
  });

  it("when Trial plays it, raises the deletion ceiling by exactly 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-039", as: "yellowSource" }],
          hand: [
            { card: "EX3-069", as: "trial" },
            { card: "EX3-064", as: "megidramon" },
            { card: "EX3-025", as: "azulongmon" },
          ],
          deck: [],
        },
        1: {
          battleArea: [
            { card: "BT1-025", as: "level6" },
            { card: "BT1-026", as: "otherLevel6" },
            { card: "AD1-025", as: "level7" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trial").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069"));
    const trial = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-069")!;
    s.state.turnCount += 1;
    await advance(s.engine).recompute();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: trial.topCard.instanceId,
        effectKey: delayEntry(trial)!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    respond(s, { kind: "selectCards", instanceIds: [s.inst("megidramon").instanceId] });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const payload = JSON.parse(s.state.pendingDecision!.payloadJson) as { candidateInstanceIds: string[] };
    expect(payload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("level6").permanentId, s.perm("otherLevel6").permanentId]),
    );
    expect(payload.candidateInstanceIds).not.toContain(s.perm("level7").permanentId);
    respond(s, { kind: "chooseTargets", instanceIds: [s.perm("level6").permanentId] });
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("level7").permanentId,
    );
    assertNoLoudGap(s);
  });

  it("Four Great Dragons family: Trial's real Delay gives Megidramon level-6 provenance", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-039", as: "yellowSource" }],
          hand: [
            { card: "EX3-069", as: "trial" },
            { card: "EX3-064", as: "megidramon" },
            { card: "EX3-025", as: "azulongmon" },
            { card: "BT1-010", as: "unrelatedHand" },
          ],
          deck: [],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "level5" },
            { card: "BT1-025", as: "level6" },
            { card: "BT1-026", as: "otherLevel6" },
            { card: "AD1-025", as: "level7" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trial").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069"));
    const trial = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-069")!;
    s.state.turnCount += 1;
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: trial.topCard.instanceId,
        effectKey: delayEntry(trial)!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const playChoice = s.decisions.at(-1)!.req;
    expect(playChoice).toMatchObject({
      sourceCardId: "EX3-069",
      options: {
        candidateInstanceIds: [s.inst("megidramon").instanceId, s.inst("azulongmon").instanceId],
        visibleInstanceIds: [
          s.inst("megidramon").instanceId,
          s.inst("azulongmon").instanceId,
          s.inst("unrelatedHand").instanceId,
        ],
      },
    });
    respond(s, { kind: "selectCards", instanceIds: [s.inst("megidramon").instanceId] });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const deletion = s.decisions.at(-1)!.req;
    expect(deletion).toMatchObject({ sourceCardId: "EX3-064", options: { timing: "OnPlay" } });
    expect(deletion.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.perm("level5").permanentId,
        s.perm("level6").permanentId,
        s.perm("otherLevel6").permanentId,
      ]),
    );
    expect(deletion.options?.candidateInstanceIds).not.toContain(s.perm("level7").permanentId);
    const deletedLevel6Id = s.perm("level6").permanentId;
    respond(s, { kind: "chooseTargets", instanceIds: [deletedLevel6Id] });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === deletedLevel6Id) &&
        s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-069"),
    );

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX3-069");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-064");
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("level7").permanentId,
    );
    assertNoLoudGap(s);
  });

  it("Q3428 places Trial after deletion without activating its Main draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-064", dp: 6000, as: "megidramon" }],
          hand: [
            { card: "EX3-069", as: "trial" },
            { card: "BT1-010", as: "unrelatedHand" },
          ],
          deck: [{ card: "BT1-011", as: "wouldBeDrawn" }, "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-025", dp: 12000, suspended: true, as: "battleWinner" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("megidramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleWinner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    respond(s, { kind: "optional", accept: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069") &&
        !s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-064"),
    );

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-069");
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("wouldBeDrawn").instanceId,
    );
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-064" && req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("honors the errata's optional decline", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-064", dp: 6000, as: "megidramon" }],
          hand: [{ card: "EX3-069", as: "trial" }],
        },
        1: { battleArea: [{ card: "BT1-025", dp: 12000, suspended: true, as: "battleWinner" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("megidramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleWinner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.sourceCardId === "EX3-064" && req.kind === "optional"));
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-064"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("trial").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not offer another Trial while one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-064", dp: 6000, as: "megidramon" },
            { card: "EX3-069", as: "trialInPlay" },
          ],
          hand: [{ card: "EX3-069", as: "trialInHand" }],
        },
        1: { battleArea: [{ card: "BT1-025", dp: 12000, suspended: true, as: "battleWinner" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-069");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("megidramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleWinner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-064"));

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-064")).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("trialInHand").instanceId);
    assertNoLoudGap(s);
  });
});
