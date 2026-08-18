import { EffectTiming, effectiveStaticNames, getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-064.js";
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

    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-064", as: "megidramon" }] } });
    await s.ready();
    expect(observe(s.engine).effectiveNames(s.perm("megidramon"))).toEqual(
      expect.arrayContaining(["megidramon", "chaosgallantmon"]),
    );
    assertNoLoudGap(s);
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
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-064", as: "megidramon" }] },
      1: {
        battleArea: [
          { card: "BT1-025", as: "level6" },
          { card: "BT1-026", as: "otherLevel6" },
          { card: "AD1-025", as: "level7" },
        ],
      },
    });
    await s.ready();

    const firing = advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("megidramon"), {
      enteredByEffect: 0,
      playedByEffect: true,
      playedByEffectSourceCardId: "EX3-069",
      subjectPermanentId: s.perm("megidramon").permanentId,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const payload = JSON.parse(s.state.pendingDecision!.payloadJson) as { candidateInstanceIds: string[] };
    expect(payload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("level6").permanentId, s.perm("otherLevel6").permanentId]),
    );
    expect(payload.candidateInstanceIds).not.toContain(s.perm("level7").permanentId);
    respond(s, { kind: "chooseTargets", instanceIds: [s.perm("level6").permanentId] });
    await firing;

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("level7").permanentId,
    );
    assertNoLoudGap(s);
  });

  it("Four Great Dragons family: Trial's real Delay gives Megidramon level-6 provenance", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-069", as: "trial" },
            { card: "EX3-064", as: "megidramon" },
            { card: "EX3-025", as: "azulongmon" },
            { card: "BT1-010", as: "unrelatedHand" },
          ],
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
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("trial").instanceId);
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
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === deletedLevel6Id));

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
          battleArea: [{ card: "EX3-064", as: "megidramon" }],
          hand: [
            { card: "EX3-069", as: "trial" },
            { card: "BT1-010", as: "unrelatedHand" },
          ],
          deck: [{ card: "BT1-001", as: "wouldBeDrawn" }, "BT1-002"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    respond(s, { kind: "optional", accept: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const placement = [...s.decisions].reverse().find(({ req }) => req.kind === "selectCards")!.req;
    expect(placement.options).toMatchObject({
      candidateInstanceIds: [s.inst("trial").instanceId],
      visibleInstanceIds: [s.inst("trial").instanceId, s.inst("unrelatedHand").instanceId],
    });
    respond(s, { kind: "selectCards", instanceIds: [s.inst("trial").instanceId] });
    await deletion;
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069"));

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
          battleArea: [{ card: "EX3-064", as: "megidramon" }],
          hand: [{ card: "EX3-069", as: "trial" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect");
    await settle(() => s.decisions.some(({ req }) => req.sourceCardId === "EX3-064" && req.kind === "optional"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("trial").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not offer another Trial while one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-064", as: "megidramon" }],
          hand: [
            { card: "EX3-069", as: "trialInPlay" },
            { card: "EX3-069", as: "trialInHand" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("trialInPlay").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-069");

    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-064"));

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-064")).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("trialInHand").instanceId);
    assertNoLoudGap(s);
  });
});
