import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./EX3-059.js";

function respond(s: EngineSetup, response: DecisionResponse): void {
  expect(
    s.engine.applyIntent(s.state.pendingDecision!.seat, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-059 DarkTyrannomon", () => {
  it("has the official dual-color metadata and inherited text", () => {
    expect(getCardDefinition("EX3-059")).toMatchObject({
      cardId: "EX3-059",
      nameEn: "DarkTyrannomon",
      colors: ["Purple", "Green"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 2 },
        { color: "Green", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dinosaur"],
      inheritedEffectText: "[On Deletion] Suspend 1 of your opponent's Digimon.",
      rarity: "C",
    });
  });

  it.each([
    ["purple", "BT10-071"],
    ["green", "BT1-064"],
  ])("digivolves from a %s level 3 for the printed cost", async (_color, baseCardId) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCardId, as: "base" }],
        hand: [{ card: "EX3-059", as: "darkTyrannomon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darkTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-059");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack).toHaveLength(1);
  });

  it("offers only ready opposing Digimon and suspends the explicitly selected target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-016", under: ["EX3-059"], as: "host" }] },
      1: {
        battleArea: [
          { card: "BT1-028", as: "chosen" },
          { card: "BT1-029", suspended: true, as: "alreadySuspended" },
          { card: "BT1-030", as: "otherReady" },
        ],
      },
    });
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-059",
      options: {
        candidateInstanceIds: expect.arrayContaining([s.perm("chosen").permanentId, s.perm("otherReady").permanentId]),
        min: 1,
        max: 1,
        timing: "OnDeletion",
        effectText: "[On Deletion] Suspend 1 of your opponent's Digimon.",
      },
    });
    expect(decision.options?.candidateInstanceIds).not.toContain(s.perm("alreadySuspended").permanentId);

    respond(s, { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] });
    await deletion;
    await settle(() => s.perm("chosen").isSuspended);
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("otherReady").isSuspended).toBe(false);
  });

  it("opens no decision when every opposing Digimon is already suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-016", under: ["EX3-059"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-028", suspended: true, as: "opponent" }] },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-059")).toHaveLength(0);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("does nothing while DarkTyrannomon is the deleted top card instead of a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-059", as: "darkTyrannomon" }] },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("darkTyrannomon").permanentId], "byEffect");
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-059")).toHaveLength(0);
  });

  it("resolves two inherited copies independently against two different ready targets", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-016", under: ["EX3-059", "EX3-059"], as: "host" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT1-029", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-059")).toHaveLength(2);
  });

  it("Dinosaur line: suspends another opponent after its MasterTyrannomon host loses a battle", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-016", under: ["EX3-059"], dp: 6000, as: "masterTyrannomon" }] },
        1: {
          battleArea: [
            { card: "BT2-018", dp: 12000, suspended: true, as: "battleWinner" },
            { card: "BT1-028", as: "effectTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("effectTarget").permanentId);
    await s.ready();
    const attackerId = s.perm("masterTyrannomon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("battleWinner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId) &&
        s.perm("effectTarget").isSuspended,
    );

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(false);
    expect(s.perm("battleWinner").isSuspended).toBe(true);
    expect(s.perm("effectTarget").isSuspended).toBe(true);
  });
});
