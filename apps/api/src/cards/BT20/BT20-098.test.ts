import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-098.js";
import "./index.js";

describe("BT20-098 Apparition Legion", () => {
  it("matches the coordinator-corrected exact-9 catalog contract", () => {
    expect(getCardDefinition("BT20-098")).toMatchObject({
      cardId: "BT20-098",
      nameEn: "Apparition Legion",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 8,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["LIBERATOR"],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT20-098")!;
    const effectText = printed.effectText!.replaceAll("\u00a0", " ");
    expect(effectText).toContain(
      "By returning 9 levels' total worth of Digimon cards from your opponent's trash to the bottom of the deck, you may play 1 [Ghost] trait Digimon card of each returned card's level from your trash without paying the costs.",
    );
    expect(effectText).not.toContain("up to 9 levels");
    expect(effectText).toContain(
      "Then, the Digimon this effect played gain ＜Rush＞ and ＜Blocker＞ until the end of your opponent's turn.",
    );
    expect(printed.securityEffectText!.replaceAll("\u00a0", " ")).toBe(
      "[Security] You may play 1 level 5 or lower Digimon card with the [Ghost] trait from your trash without paying the cost.",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("matches the errata and applies Rush and Blocker to every Digimon it played", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main");
    const play = main?.actions[0];
    const returnCost = play?.kind === "PlayPerLevel" ? play.cost : undefined;
    const keywordActions = main?.actions.slice(1);

    expect(returnCost).toMatchObject({
      kind: "return",
      target: { count: "all", totalLevels: 9 },
    });
    expect(returnCost).toMatchObject({
      target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] } },
    });
    expect(returnCost?.target?.upTo).not.toBe(true);
    expect(keywordActions).toHaveLength(2);
    expect(keywordActions?.map((action) => action.kind)).toEqual(["GainKeyword", "GainKeyword"]);
    expect(keywordActions?.map((action) => irNode(action).keyword.keyword)).toEqual(["Rush", "Blocker"]);
    expect(keywordActions?.every((action) => irNode(action).target.count === "all")).toBe(true);
    expect(keywordActions?.every((action) => action.optional !== true)).toBe(true);
    expect(play).toMatchObject({
      playFilter: {
        zone: "trash",
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
      },
      matchLevel: true,
      payCost: false,
      bindResultAs: "playedByThisEffect",
    });
  });

  it("naturally pays exactly 9 returned opponent-trash levels and plays one Ghost at each level", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-098", as: "option" }],
          battleArea: ["BT20-062"],
          trash: [
            { card: "BT20-063", as: "ghost3" },
            { card: "BT20-079", as: "ghost6" },
          ],
        },
        1: {
          trash: ["BT20-062", "BT20-079"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const ids = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId);
      return ids.includes("BT20-063") && ids.includes("BT20-079");
    });

    expect(s.state.players[1]!.trash).toHaveLength(0);
    for (const alias of ["ghost3", "ghost6"] as const) {
      const permanent = s.perm(alias);
      expect(permanent.isSuspended).toBe(false);
    }
    expect(s.perm("ghost3").topCard.cardId).toBe("BT20-063");
    expect(s.perm("ghost6").topCard.cardId).toBe("BT20-079");
    for (const alias of ["ghost3", "ghost6"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Rush")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(true);
    }
  });

  it("accepts three repeated level-3 returns for the errata exact total", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-063", as: "source" }],
          hand: [{ card: "BT20-098", as: "option" }],
          trash: [
            { card: "BT20-063", as: "ghost1" },
            { card: "BT20-063", as: "ghost2" },
            { card: "BT20-063", as: "ghost3" },
          ],
          deck: ["BT1-010"],
        },
        1: {
          trash: [
            { card: "BT20-063", as: "returned1" },
            { card: "BT20-063", as: "returned2" },
            { card: "BT20-063", as: "returned3" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 0 && s.state.players[0]!.battleArea.length === 4);
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.topCard.cardId === "BT20-063")).toBe(true);
    for (const alias of ["ghost1", "ghost2", "ghost3"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Rush")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(true);
    }
  });

  it("keeps Rush and Blocker through the opponent's turn, then expires them", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-098", as: "option" }],
          battleArea: [{ card: "BT18-094", as: "purpleSource" }],
          trash: ["BT20-062", "BT20-062", "BT20-062"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          trash: ["BT20-062", "BT20-062", "BT20-062"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 4);
    for (const permanent of s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT20-062")) {
      expect(observe(s.engine).hasKeyword(permanent, "Rush")).toBe(true);
      expect(observe(s.engine).hasKeyword(permanent, "Blocker")).toBe(true);
    }
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    for (const permanent of s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT20-062")) {
      expect(observe(s.engine).hasKeyword(permanent, "Rush")).toBe(true);
      expect(observe(s.engine).hasKeyword(permanent, "Blocker")).toBe(true);
    }
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    for (const permanent of s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT20-062")) {
      expect(observe(s.engine).hasKeyword(permanent, "Rush")).toBe(false);
      expect(observe(s.engine).hasKeyword(permanent, "Blocker")).toBe(false);
    }
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not partially pay when no opponent-trash combination totals exactly 9", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-063", as: "source" }],
          hand: [{ card: "BT20-098", as: "option" }],
          trash: [{ card: "BT20-063", as: "ghost" }],
        },
        1: {
          trash: [
            { card: "BT20-068", as: "level4a" },
            { card: "BT20-068", as: "level4b" },
            { card: "BT20-079", as: "level6" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT20-068", "BT20-068", "BT20-079"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-063"]);
  });

  it("can refuse a valid exact-9 return without moving either trash pool", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-063", as: "source" }],
          hand: [{ card: "BT20-098", as: "option" }],
          trash: [{ card: "BT20-063", as: "ghost" }],
        },
        1: {
          trash: [
            { card: "BT20-062", as: "level3" },
            { card: "BT20-079", as: "level6" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT20-062", "BT20-079"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-063"]);
  });

  it("public Security check plays one qualifying Ghost from trash without cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
        1: {
          security: [{ card: "BT20-098", faceUp: true }],
          trash: [
            { card: "BT20-063", as: "ghost" },
            { card: "BT20-079", as: "tooHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT20-063"));
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toContain("BT20-063");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT20-079");
  });
});
