import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-010.js";

function respond(s: EngineSetup, response: DecisionResponse): void {
  const request = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(request.seat, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-010 Paildramon", () => {
  it("matches its official identity, DNA route, and complete text", () => {
    expect(getCardDefinition("EX3-010")).toMatchObject({
      cardId: "EX3-010",
      nameEn: "Paildramon",
      colors: ["Red", "Purple"],
      level: 5,
      playCost: 8,
      dp: 8000,
      types: ["Dragonkin"],
    });
    expect(getCardDefinition("EX3-010")!.effectText).toContain("DNA Digivolution: 0 from red Lv.4 + purple Lv.4");
    expect(getCardDefinition("EX3-010")!.inheritedEffectText).toContain("Imperialdramon");
  });
  it("DNA digivolves for 0 and exposes only Dinobeemon trash candidates with friendly provenance", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-008", as: "red" },
            { card: "EX3-058", as: "purple" },
          ],
          hand: [{ card: "EX3-010", as: "paildramon" }],
          trash: [
            { card: "EX3-061", as: "dinobeemon" },
            { card: "ST9-11", as: "otherDinobeemon" },
            { card: "BT1-009", as: "wrongName" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: false },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("red").permanentId, s.perm("purple").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-010",
      options: { timing: "WhenDigivolving" },
    });
    respond(s, { kind: "optional", accept: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.at(-1)!.req.options!;
    expect(selection.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("dinobeemon").instanceId, s.inst("otherDinobeemon").instanceId]),
    );
    expect(selection.candidateInstanceIds).not.toContain(s.inst("wrongName").instanceId);
    expect(selection.visibleInstanceIds).toEqual([
      s.inst("dinobeemon").instanceId,
      s.inst("otherDinobeemon").instanceId,
      s.inst("wrongName").instanceId,
    ]);
    expect(selection.effectText).toContain("Dinobeemon");
    respond(s, { kind: "selectCards", instanceIds: [s.inst("otherDinobeemon").instanceId] });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "ST9-11"));
    assertNoLoudGap(s);
  });

  it.each([
    ["red", "EX3-008"],
    ["purple", "EX3-058"],
  ])("digivolves normally from a %s level 4 and does not offer Dinobeemon", async (_color, baseCardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX3-010", as: "paildramon" }],
          trash: [{ card: "EX3-061", as: "dinobeemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-010");
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-010"));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("dinobeemon").instanceId)).toBe(
      true,
    );
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX3-010")).toBe(false);
  });

  it("may decline the DNA-only Dinobeemon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-008", as: "red" },
            { card: "EX3-058", as: "purple" },
          ],
          hand: [{ card: "EX3-010", as: "paildramon" }],
          trash: [{ card: "EX3-061", as: "dinobeemon" }],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("red").permanentId, s.perm("purple").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-010"));
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-010"));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("dinobeemon").instanceId)).toBe(
      true,
    );
  });

  it("plays Veemon from its owner's trash without cost when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 13_000 }] },
        1: {
          battleArea: [{ card: "EX3-010", as: "paildramon", suspended: true }],
          trash: [{ card: "EX3-004", as: "veemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("paildramon").permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-004"));
    await settle(() => s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX3-010"));
    expect(s.decisions.find(({ req }) => req.sourceCardId === "EX3-010" && req.kind === "optional")?.req).toMatchObject(
      {
        sourceCardId: "EX3-010",
        options: { timing: "OnDeletion", effectText: expect.stringContaining("Veemon") },
      },
    );
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX3-010")).toBe(true);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX3-004")).toBe(false);
  });

  it("may decline its On Deletion play after effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-010", as: "paildramon" }],
          trash: [{ card: "EX3-004", as: "veemon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("paildramon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-010"));
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-010"));

    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX3-010" && req.kind === "optional")).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("veemon").instanceId)).toBe(true);
  });

  it("offers exact Veemon but excludes ExVeemon and DemiVeemon from the On Deletion play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-010", as: "paildramon" }],
          trash: [
            { card: "EX3-004", as: "veemon" },
            { card: "ST8-04", as: "otherVeemon" },
            { card: "ST9-04", as: "exVeemon" },
            { card: "BT12-002", as: "demiVeemon" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("paildramon").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "optional", 5000);
    respond(s, { kind: "optional", accept: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards", 5000);

    const request = s.decisions.at(-1)!.req;
    expect(request).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-010",
      options: {
        candidateInstanceIds: [s.inst("veemon").instanceId, s.inst("otherVeemon").instanceId],
        visibleInstanceIds: expect.arrayContaining([
          s.inst("veemon").instanceId,
          s.inst("otherVeemon").instanceId,
          s.inst("exVeemon").instanceId,
          s.inst("demiVeemon").instanceId,
        ]),
      },
    });
    respond(s, { kind: "selectCards", instanceIds: [s.inst("veemon").instanceId] });
    await deletion;
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-004"));
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants Security Attack +1 only while inherited by an Imperialdramon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-063", under: ["EX3-010"], as: "imperialdramon" }] },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("imperialdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not grant Security Attack +1 to a non-Imperialdramon carrier", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["EX3-010"], as: "other" }] },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("does not grant inherited Security Attack +1 during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-063", under: ["EX3-010"], as: "imperialdramon" }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("imperialdramon"), "SecurityAttack")).toBe(false);
  });
});
