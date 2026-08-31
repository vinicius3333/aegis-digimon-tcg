import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-071.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-071 Flarerizamon", () => {
  it("compiles inherited Raid and both delete triggers", () => {
    expect(getCardDefinition("BT26-071")).toMatchObject({
      nameEn: "Flarerizamon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 5000,
      types: ["Fire Dragon", "NSo"],
    });
    expect(digivolutionRequirementsFor("BT26-071")).toContainEqual({
      level: 3,
      traits: ["NSo"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["Static", "OnPlay", "WhenDigivolving"]);
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      optional: true,
      abortOnDecline: true,
      allowCostWithoutTarget: true,
    });
  });
  it("uses the cost-2 NSo evolution path from an off-color level 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-030", as: "yellowNsoBase" }],
        hand: [{ card: "BT26-071", as: "flarerizamon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowNsoBase").permanentId,
        instanceId: s.inst("flarerizamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowNsoBase").topCard.cardId === "BT26-071");

    expect(s.state.memory).toBe(0);
  });
  it("deletes an own Digimon as cost, then deletes an opposing level-4 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-071", as: "self" }], battleArea: [{ card: "BT26-012", as: "ownCost" }] },
        1: {
          battleArea: [
            { card: "BT26-020", as: "target" },
            { card: "BT26-054", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownCost").permanentId);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT26-071");
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT26-054");
  });
  it("may decline without deleting either player's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-071", as: "flarerizamon" },
            { card: "BT26-012", as: "own" },
          ],
        },
        1: { battleArea: [{ card: "BT26-020", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const ownCount = s.state.players[0]!.battleArea.length;
    const opponentCount = s.state.players[1]!.battleArea.length;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("flarerizamon"));

    expect(s.state.players[0]!.battleArea).toHaveLength(ownCount);
    expect(s.state.players[1]!.battleArea).toHaveLength(opponentCount);
  });
  it("may pay its own-Digimon cost even without a legal opposing level-4 target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-071", as: "flarerizamon" },
            { card: "BT26-012", as: "ownCost" },
          ],
        },
        1: { battleArea: [{ card: "BT26-054", as: "opponentLevel5" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownCost").permanentId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("flarerizamon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-071"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-054"]);
  });
  it("grants inherited Raid to its evolution host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-072", as: "host", under: ["BT26-071"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
  });

  it("executes inherited Raid by switching a player attack to a suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-073", as: "host", under: ["BT26-071"] }] },
        1: { battleArea: [{ card: "BT26-060", as: "raidTarget" }], security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("raidTarget").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(targetId);
  });
});
