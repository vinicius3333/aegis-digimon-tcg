import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST6/ST6-04.js";
import "./BT2-080.js";

describe("BT2-080 Piedmon", () => {
  it("plays up to two level 4 or lower purple Digimon from trash without paying costs", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT2-080", as: "piedmon" }],
          trash: [
            { card: "BT2-067", as: "purpleRookie" },
            { card: "BT2-071", as: "purpleChampion" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("offers only purple level 4 or lower Digimon as candidates", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT2-080", as: "piedmon" }],
        trash: [
          { card: "BT2-067", as: "eligibleRookie" },
          { card: "ST6-04", as: "eligibleOnPlay" },
          { card: "BT2-071", as: "eligibleChampion" },
          { card: "BT2-075", as: "purpleLevelFive" },
          { card: "BT2-034", as: "yellowLevelFour" },
          { card: "ST6-15", as: "purpleOption" },
        ],
      },
    });
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === selection.decisionId)!.req;

    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("eligibleRookie").instanceId,
        s.inst("eligibleOnPlay").instanceId,
        s.inst("eligibleChampion").instanceId,
      ]),
    );
    for (const alias of ["purpleLevelFive", "yellowLevelFour", "purpleOption"]) {
      expect(request.options!.candidateInstanceIds).not.toContain(s.inst(alias).instanceId);
    }
    expect(request.options).toMatchObject({ min: 0, max: 2 });
  });

  it("suppresses On Play effects of Digimon played by its effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT2-080", as: "piedmon" }],
          trash: [
            { card: "ST6-04", as: "dracmon" },
            { card: "BT2-071", as: "wizardmon" },
            { card: "ST6-15", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash[0]!.instanceId).toBe(s.inst("option").instanceId);
  });

  it("may decline to play any Digimon from trash", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT2-080", as: "piedmon" }],
        trash: [{ card: "BT2-067", as: "candidate" }],
      },
    });
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash[0]!.instanceId).toBe(s.inst("candidate").instanceId);
  });

  it("has Retaliation and deletes the Digimon it loses a battle against", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-080", as: "piedmon" }] },
      1: { battleArea: [{ card: "BT1-084", as: "opponent", suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("piedmon"), "Retaliation")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("piedmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-084")).toBe(true);
  });
});
