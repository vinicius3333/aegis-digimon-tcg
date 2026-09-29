import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-111.js";
import "./BT11-111.js";
import "./BT11-109.js";
import "../BT2/BT2-105.js";
import "../ST2/ST2-16.js";
import "../BT12/BT12-102.js";
import "../ST10/ST10-14.js";
import "../ST1/ST1-16.js";
import "../BT8/BT8-094.js";
describe("BT11-111 Galacticmon", () => {
  it("models all printed effects, including the Vemmon leave-play replacement", () => {
    expect(getCardDefinition("BT11-111")!.effectText).toContain("8 or more [Vemmon]");
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Snatchmon"], cost: 9, isAlternate: true }]);
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      underFilter: { isSelfRef: true },
      position: "bottom",
      optional: true,
    });
    expect(compiled.effects[0]?.actions[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "selfDigivolutionStackCountAtLeast", count: 8 },
    });
    expect(compiled.effects[0]?.actions[1]).not.toHaveProperty("optional");
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          cost: {
            kind: "return",
            target: {
              filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } },
              from: ["digivolutionCards"],
            },
            to: "deckBottom",
          },
        },
      ],
    });
  });

  it("trashes the opponent's top security at start of main", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-111", as: "galactic" }, "BT1-009"],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-012", "BT1-013"],
      },
      1: {
        deck: ["BT1-014", "BT1-015"],
        security: [
          { card: "BT1-016", as: "topSecurity" },
          { card: "BT1-017", as: "remainingSecurity" },
        ],
      },
    });
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security[0]?.instanceId).toBe(s.inst("remainingSecurity").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("topSecurity").instanceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("places four trash Vemmon under the evolved Galacticmon at stack bottom and deletes at eight", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-066", as: "base", under: ["BT11-061", "BT11-061", "BT11-061", "BT11-061"] },
            { card: "BT1-009", as: "neighbor", under: ["BT11-061"] },
          ],
          hand: [{ card: "BT11-111", as: "galactic" }],
          trash: [
            { card: "BT11-061", as: "trashVemmon1" },
            { card: "BT11-061", as: "trashVemmon2" },
            { card: "BT11-061", as: "trashVemmon3" },
            { card: "BT11-061", as: "trashVemmon4" },
            { card: "BT11-061", as: "trashVemmon5" },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("neighbor").permanentId);
    const opponentTargetId = s.perm("opponentTarget").topCard.instanceId;
    const trashVemmonIds = ["trashVemmon1", "trashVemmon2", "trashVemmon3", "trashVemmon4"]
      .map((alias) => s.inst(alias).instanceId)
      .sort();
    const cappedTrashVemmonId = s.inst("trashVemmon5").instanceId;
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("galactic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT11-111" && s.state.players[1]!.battleArea.length === 0);

    const galacticmon = s.perm("base");
    expect(galacticmon.stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(8);
    expect(
      galacticmon.stack
        .slice(0, 4)
        .map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual(trashVemmonIds);
    expect(s.perm("neighbor").stack.map(({ cardId }) => cardId)).toEqual(["BT11-061"]);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(cappedTrashVemmonId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(opponentTargetId);
  });

  it("deletes after declining optional placement when the evolved stack already has eight Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-066", as: "base", under: Array.from({ length: 8 }, () => "BT11-061") }],
          hand: [{ card: "BT11-111", as: "galactic" }],
          trash: [
            { card: "BT11-061", as: "declinedVemmon1" },
            { card: "BT11-061", as: "declinedVemmon2" },
            { card: "BT11-061", as: "declinedVemmon3" },
            { card: "BT11-061", as: "declinedVemmon4" },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const opponentTargetId = s.perm("opponentTarget").topCard.instanceId;
    const declinedVemmonIds = ["declinedVemmon1", "declinedVemmon2", "declinedVemmon3", "declinedVemmon4"].map(
      (alias) => s.inst(alias).instanceId,
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("galactic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.perm("base").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(8);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(declinedVemmonIds),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(opponentTargetId);
  });

  it("returns exactly four Galacticmon-stack Vemmon to deck bottom and prevents its departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-111",
              as: "galactic",
              under: ["BT11-061", "BT11-061", "BT11-061", "BT11-061", { card: "BT11-066", as: "nonVemmon" }],
            },
            { card: "BT1-009", as: "neighbor", under: [{ card: "BT11-061", as: "neighborVemmon" }] },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const galacticmonId = s.perm("galactic").permanentId;
    const returnedVemmonIds = s
      .perm("galactic")
      .stack.filter(({ cardId }) => cardId === "BT11-061")
      .map(({ instanceId }) => instanceId)
      .sort();
    const neighborVemmonId = s.inst("neighborVemmon").instanceId;
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await driver.verb.deletePermanent([galacticmonId], "byEffect")).toBe(0);
    } finally {
      driver.verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(galacticmonId);
    expect(s.perm("galactic").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(0);
    expect(s.perm("galactic").stack.map(({ cardId }) => cardId)).toEqual(["BT11-066"]);
    expect(s.perm("neighbor").stack.map(({ cardId }) => cardId)).toEqual(["BT11-061"]);
    expect(
      s.state.players[0]!.deck.slice(-4)
        .map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual(returnedVemmonIds);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toContain(neighborVemmonId);
  });
});

describe("BT11-111 Galacticmon — KB Q&A rulings", () => {
  const instanceIdsOf = (cards: Iterable<{ instanceId: string }>): string[] =>
    Array.from(cards, ({ instanceId }) => instanceId);

  const galacticmonWithFourVemmon: PermanentSpec = {
    card: "BT11-111",
    as: "galactic",
    under: [
      { card: "BT11-061", as: "vemmon1" },
      { card: "BT11-061", as: "vemmon2" },
      { card: "BT11-061", as: "vemmon3" },
      { card: "BT11-061", as: "vemmon4" },
      { card: "BT11-066", as: "tekkamon" },
    ],
  };
  const vemmonAliases = ["vemmon1", "vemmon2", "vemmon3", "vemmon4"];

  /** Seat 0 uses an Option on Galacticmon (seat 1); both seats accept every optional prompt. */
  async function useOptionOnGalacticmon(optionCardId: string, colorSupportCardIds: string[]): Promise<EngineSetup> {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [...colorSupportCardIds, "BT11-082"],
          hand: [{ card: optionCardId, as: "option" }],
        },
        1: {
          battleArea: [galacticmonWithFourVemmon, { card: "BT1-015", as: "otherDigimon" }],
          deck: [{ card: "BT1-009", as: "deckCard" }],
          security: [{ card: "BT1-010", as: "securityCard" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("galactic").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));
    return s;
  }

  function expectPreventedByReturningFourVemmon(s: EngineSetup): void {
    const galacticmon = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === "BT11-111");
    expect(galacticmon?.permanentId).toBe(s.perm("galactic").permanentId);
    expect(instanceIdsOf(galacticmon!.stack)).toEqual([s.inst("tekkamon").instanceId]);
    expect(instanceIdsOf(s.state.players[1]!.deck.slice(-4)).sort()).toEqual(
      vemmonAliases.map((alias) => s.inst(alias).instanceId).sort(),
    );
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT11-111")).toBe(true);
  }

  it("cannot return 4 [Vemmon] to prevent a <De-Digivolve> effect (Q2138)", async () => {
    const s = await useOptionOnGalacticmon("BT2-105", ["BT11-066"]);

    expect(s.decisions.some(({ req }) => req.sourceCardId === "BT11-111")).toBe(false);
    expect(s.perm("galactic").topCard.instanceId).toBe(s.inst("tekkamon").instanceId);
    expect(instanceIdsOf(s.state.players[1]!.trash)).toContain(s.inst("galactic").instanceId);
    expect(instanceIdsOf(s.perm("galactic").stack)).toEqual(vemmonAliases.map((alias) => s.inst(alias).instanceId));
    expect(instanceIdsOf(s.state.players[1]!.deck)).toEqual([s.inst("deckCard").instanceId]);
  });

  it("treats being trashed, returned to hand, or placed under another card as leaving the battle area (Q2139)", async () => {
    const deleted = await useOptionOnGalacticmon("ST1-16", ["ST1-03"]);
    expectPreventedByReturningFourVemmon(deleted);
    expect(instanceIdsOf(deleted.state.players[1]!.trash)).not.toContain(deleted.inst("galactic").instanceId);

    const returnedToHand = await useOptionOnGalacticmon("ST2-16", ["ST2-03"]);
    expectPreventedByReturningFourVemmon(returnedToHand);
    expect(returnedToHand.state.players[1]!.hand).toHaveLength(0);

    const placedUnder = await useOptionOnGalacticmon("BT11-109", ["BT11-077"]);
    expectPreventedByReturningFourVemmon(placedUnder);
    expect(instanceIdsOf(placedUnder.perm("otherDigimon").stack)).toEqual([]);
  });

  it("can return 4 [Vemmon] to prevent being returned to the deck or placed in security (Q2140)", async () => {
    const returnedToDeck = await useOptionOnGalacticmon("BT12-102", ["ST2-03"]);
    expectPreventedByReturningFourVemmon(returnedToDeck);

    const placedInSecurity = await useOptionOnGalacticmon("ST10-14", ["BT1-045", "BT11-077"]);
    expectPreventedByReturningFourVemmon(placedInSecurity);
    expect(instanceIdsOf(placedInSecurity.state.players[1]!.security)).toEqual([
      placedInSecurity.inst("securityCard").instanceId,
    ]);
  });

  it("does not activate [Start of Your Main Phase] when the memory crosses to the opponent before the main phase (Q2141)", async () => {
    async function runTurnWithBreedingMove(opponentGainsMemory: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT11-111", as: "galactic" }],
            breeding: { card: "BT1-009", as: "mover" },
            deck: ["BT1-010", "BT1-010"],
          },
          1: {
            battleArea: opponentGainsMemory ? [{ card: "BT8-094", as: "emperor" }] : [],
            deck: ["BT1-010"],
            security: [
              { card: "BT1-016", as: "topSecurity" },
              { card: "BT1-017", as: "bottomSecurity" },
            ],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.isFirstPlayersFirstTurn = false;
      s.state.memory = 1;
      await s.ready();

      const turn = s.engine.runOneTurn();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
        ok: true,
      });
      if (!opponentGainsMemory) {
        await advance(s.engine).waitForMainPhase(0);
        advance(s.engine).endMainPhaseIfOpen(0);
      }
      await turn;
      return {
        mainPhaseRan: s.events.some((event) => event.kind === "phaseChanged" && event.phase === Phase.Main),
        opponentSecurity: instanceIdsOf(s.state.players[1]!.security),
        topSecurityId: s.inst("topSecurity").instanceId,
        bottomSecurityId: s.inst("bottomSecurity").instanceId,
      };
    }

    const crossed = await runTurnWithBreedingMove(true);
    expect(crossed.mainPhaseRan).toBe(false);
    expect(crossed.opponentSecurity).toEqual([crossed.topSecurityId, crossed.bottomSecurityId]);

    const control = await runTurnWithBreedingMove(false);
    expect(control.mainPhaseRan).toBe(true);
    expect(control.opponentSecurity).toEqual([control.bottomSecurityId]);
  });
});
