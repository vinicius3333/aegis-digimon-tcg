import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT14/BT14-021.js";
import "./EX3-056.js";

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

describe("EX3-056 Guilmon", () => {
  it("matches the official metadata, printed evolution, and Gigimon alternate evolution", async () => {
    const definition = getCardDefinition("EX3-056")!;
    expect(definition).toMatchObject({
      cardId: "EX3-056",
      colors: ["Purple", "Red"],
      level: 3,
      playCost: 4,
      dp: 3000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Reptile"],
      rarity: "C",
    });
    expect(definition.evoCosts).toEqual([{ color: "Purple", level: 2, memoryCost: 1 }]);
    expect(definition.effectText).toContain("Digivolve: 0 from [Gigimon]");
    expect(definition.effectText).toContain("[On Deletion]");

    const alternate = setupEngine({
      0: {
        breeding: { card: "EX2-001", as: "gigimon" },
        hand: [{ card: "EX3-056", as: "alternateGuilmon" }],
        deck: ["BT1-001"],
      },
    });
    alternate.state.memory = 0;
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("gigimon").permanentId,
        instanceId: alternate.inst("alternateGuilmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.state.players[0]!.breeding?.topCard.cardId === "EX3-056");
    expect(alternate.state.memory).toBe(0);

    const printed = setupEngine({
      0: {
        breeding: { card: "BT10-006", as: "purpleEgg" },
        hand: [{ card: "EX3-056", as: "printedGuilmon" }],
        deck: ["BT1-001"],
      },
    });
    printed.state.memory = 1;
    await printed.ready();
    expect(
      printed.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: printed.perm("purpleEgg").permanentId,
        instanceId: printed.inst("printedGuilmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => printed.state.players[0]!.breeding?.topCard.cardId === "EX3-056");
    expect(printed.state.memory).toBe(0);

    const wrongName = setupEngine({
      0: {
        breeding: { card: "BT10-006", as: "notGigimon" },
        hand: [{ card: "EX3-056", as: "printedOnlyGuilmon" }],
      },
    });
    wrongName.state.memory = 0;
    await wrongName.ready();
    expect(
      wrongName.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongName.perm("notGigimon").permanentId,
        instanceId: wrongName.inst("printedOnlyGuilmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => wrongName.state.players[0]!.breeding?.topCard.cardId === "EX3-056");
    expect(wrongName.state.memory).toBe(-1);
  });

  it("On Deletion exposes only 3000-DP-or-less opponents and deletes exactly the chosen Reptile", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-056", as: "guilmon" }],
        deck: [
          { card: "BT1-001", as: "ownTop" },
          { card: "BT1-002", as: "ownSecond" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "reptileTarget" },
          { card: "EX3-056", as: "boundaryTarget" },
          { card: "BT1-014", as: "tooLarge" },
        ],
        deck: [
          { card: "BT1-003", as: "opponentTop" },
          { card: "BT1-004", as: "opponentSecond" },
        ],
      },
    });
    await s.ready();
    const guilmonId = s.perm("guilmon").permanentId;
    const reptileInstanceId = s.perm("reptileTarget").topCard.instanceId;
    const deletion = advance(s.engine).verb.deletePermanent([guilmonId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-056",
      options: { timing: "OnDeletion", min: 1, max: 1 },
    });
    expect(payload(s).candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("reptileTarget").permanentId, s.perm("boundaryTarget").permanentId]),
    );
    expect(payload(s).candidateInstanceIds).not.toContain(s.perm("tooLarge").permanentId);
    expect(payload(s).effectText).toContain("If no Digimon is deleted by this effect");

    respond(s, {
      kind: "chooseTargets",
      instanceIds: [s.perm("reptileTarget").permanentId],
    });
    await deletion;
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === reptileInstanceId),
    );

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("boundaryTarget").permanentId,
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("tooLarge").permanentId,
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("ownTop").instanceId,
      s.inst("ownSecond").instanceId,
    ]);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("opponentTop").instanceId,
      s.inst("opponentSecond").instanceId,
    ]);
  });

  it("mills up to 2 cards from both decks when no opposing Digimon is eligible", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-056", as: "guilmon" }],
        deck: [
          { card: "BT1-001", as: "ownTop" },
          { card: "BT1-002", as: "ownSecond" },
          { card: "BT1-003", as: "ownRemaining" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-014", as: "tooLarge" }],
        deck: [{ card: "BT1-004", as: "onlyOpponentCard" }],
      },
    });
    await s.ready();
    const guilmonInstanceId = s.perm("guilmon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("guilmon").permanentId], "byEffect");
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("ownSecond").instanceId) &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("onlyOpponentCard").instanceId),
    );

    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("ownRemaining").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([guilmonInstanceId, s.inst("ownTop").instanceId, s.inst("ownSecond").instanceId]),
    );
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("tooLarge").permanentId,
    );
  });

  it("Virus-family Evade prevention counts as no deletion and therefore mills both decks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-056", as: "guilmon" }],
        deck: [
          { card: "BT1-001", as: "ownTop" },
          { card: "BT1-002", as: "ownSecond" },
        ],
      },
      1: {
        battleArea: [{ card: "BT14-021", as: "virusTarget" }],
        deck: [
          { card: "BT1-003", as: "opponentTop" },
          { card: "BT1-004", as: "opponentSecond" },
        ],
      },
    });
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("guilmon").permanentId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(1, {
        type: "respondEvade",
        permanentId: s.perm("virusTarget").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[1]!.deck.length === 0);

    expect(s.perm("virusTarget").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("virusTarget").permanentId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("ownTop").instanceId, s.inst("ownSecond").instanceId]),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("opponentTop").instanceId, s.inst("opponentSecond").instanceId]),
    );
  });
});
