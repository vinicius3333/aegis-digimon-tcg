import { describe, expect, it } from "vitest";
import { compiledEffects, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-034.js";
import "./TOKEN-Kotenken.js";

const cardId = "EX12-034";

describe("EX12-034 Erlangmon", () => {
  it("maps Kotenken, the lowest-level return watcher, and the SW leave replacement", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Erlangmon",
      colors: ["Blue", "Black"],
      playCost: 12,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Shaman", "Saneiketsu", "Tentei Hachibushu", "Shambala", "SW"],
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["Shambala"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "PlayToken", tokens: ["Kotenken"], count: 1, payCost: false, optional: true }],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Return",
              to: "deckBottom",
              target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
            },
          ],
        },
      ],
    });
    const replacement = compiled.effects.filter((effect) => effect.trigger === "AllTurns")[1]!;
    expect(replacement).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                source: "thisDigimon",
                filter: { levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["SW"], match: "trait" }] },
              },
            },
          ],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiledEffects[cardId]).toEqual(compiled);

    expect(getCardDefinition("TOKEN-Kotenken")).toMatchObject({
      nameEn: "Kotenken",
      colors: ["Black"],
      dp: 9000,
      playCost: -1,
      kinds: ["Digimon"],
      isToken: true,
    });
    expect(registeredCompiledCards.get("TOKEN-Kotenken")).toEqual(compiledEffects["TOKEN-Kotenken"]);
  });

  it("returns the opponent's lowest-level Digimon after one of your Digimon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-034", as: "source" }], hand: [{ card: "BT1-009", as: "played" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-014", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const lowestId = s.perm("lowest").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId } as never)).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId));

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("higher").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("plays a real 9000-DP Blocker token and triggers its watcher when Erlangmon itself is played (Q6775)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-014", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-Kotenken") &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"),
    );

    const token = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "TOKEN-Kotenken")!;
    expect(token.currentDP).toBe(9000);
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("plays the same Kotenken token when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-031", as: "base" }],
          hand: [{ card: cardId, as: "source" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-Kotenken"),
    );

    expect(s.perm("base").topCard?.cardId).toBe(cardId);
    expect(s.state.memory).toBe(0);
  });

  it("plays a qualifying SW card from this Digimon's stack when another own Digimon would leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-034", as: "source", under: ["EX12-039"] },
            { card: "BT1-009", as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    await advance(s.engine).verb.deletePermanent([victimId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-039"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.perm("source").stack.some((card) => card.cardId === "EX12-039")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-039")).toBe(true);
  });

  it("plays a level-five SW card from hand and also triggers when Erlangmon itself would leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX12-039", as: "sw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-039"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-039")).toBe(true);
  });

  it("reads digivolution-card candidates only from Erlangmon and enforces the level-5 ceiling", async () => {
    const victimStack = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "victim", under: ["EX12-015"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await victimStack.ready();
    expect(
      await advance(victimStack.engine).verb.deletePermanent([victimStack.perm("victim").permanentId], "byEffect"),
    ).toBe(1);
    expect(victimStack.state.players[0]!.battleArea).toHaveLength(1);
    expect(victimStack.state.players[0]!.trash.some((card) => card.cardId === "EX12-015")).toBe(true);

    const tooHigh = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "victim" },
          ],
          hand: [{ card: cardId, as: "levelSix" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await tooHigh.ready();
    expect(await advance(tooHigh.engine).verb.deletePermanent([tooHigh.perm("victim").permanentId], "byEffect")).toBe(
      1,
    );
    expect(tooHigh.state.players[0]!.battleArea).toHaveLength(1);
    expect(tooHigh.state.players[0]!.hand.some((card) => card.instanceId === tooHigh.inst("levelSix").instanceId)).toBe(
      true,
    );
  });

  it("uses both normal colors and the Shambala alternate evolution route", async () => {
    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["BT1-040", false, 4],
      ["BT23-056", false, 4],
      ["EX12-031", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = startingMemory;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "EX12-044", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
