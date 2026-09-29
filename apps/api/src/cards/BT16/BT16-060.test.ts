import { compiledEffects, getCardDefinition, type CompiledCard } from "@aegis/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { registeredCompiledCards, registeredIrModules } from "../../engine/effects/interpreter/compiledCards.js";
import { unregisterCard } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { syntheticDefinitions } from "../../engine/testkit/syntheticDefinitions.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT16-060.js";
import "../index.js";

describe("BT16-060 Tankdramon IR", () => {
  it("scales each play-cost reduction from matching revealed cards", () => {
    const reductions = compiled.effects
      .flatMap((effect) => effect.actions)
      .filter((action) => action.kind === "CostModifier");

    expect(reductions).toHaveLength(2);
    for (const reduction of reductions) {
      expect(reduction).toMatchObject({
        kind: "CostModifier",
        mode: "reduce",
        costType: "play",
        amount: 1,
        existingPermanent: true,
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" },
          count: "all",
        },
        duration: "forTheTurn",
      });
      expect(reduction.scaling?.unit).toBe("cards");
      expect(reduction.scaling?.filter?.zone).toBe("revealed");
    }
    expect(irNode(compiled.effects[0]?.actions[0])?.rest).toBe("deckTopOrBottom");
    expect(irNode(compiled.effects[1]?.actions[0])?.rest).toBe("deckTopOrBottom");
  });

  it("naturally reveals, scales existing opponent costs, returns the reveal, then deletes at the reduced cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-060", as: "tank" }],
          deck: [
            { card: "BT16-050", as: "revealedTraitOne" },
            { card: "BT16-050", as: "revealedTraitTwo" },
            { card: "BT1-009", as: "revealedNonTrait" },
            { card: "BT1-009", as: "unrevealed" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "reducedTarget" },
            { card: "BT1-022", as: "unreducedTarget" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("reducedTarget").permanentId);
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tank").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-020"));

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-022"]);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT16-050", "BT16-050", "BT1-009", "BT1-009"]),
    );
  });

  it("naturally de-digivolves one opponent when another own D-Brigade/DigiPolice Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-050", as: "command" }],
          battleArea: [{ card: "BT1-009", as: "tank", under: ["BT16-060"] }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "target", under: ["BT1-009"] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("command").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT1-009");

    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(s.perm("target").stack).toHaveLength(0);
  });
});

describe("BT16-060 Tankdramon — KB Q&A rulings", () => {
  // Tankdramon's reduction is only observable through a later play-cost read, so each ruling
  // plays a cost-0 probe Digimon whose [On Play] reads the opponent's live play costs.
  const ZERO_COST_PROBE = "TEST-BT16-060-ZERO-COST-PROBE";
  const HAND_COST_PROBE = "TEST-BT16-060-HAND-COST-PROBE";
  const probes: Record<string, CompiledCard> = {
    [ZERO_COST_PROBE]: {
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], playCostGte: 0, playCostLte: 0 },
                count: "all",
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    },
    [HAND_COST_PROBE]: {
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 2 }, count: "all" },
            },
            {
              kind: "Trash",
              target: {
                filter: { controller: "opponent", zone: "hand", kind: ["Digimon"], playCostLte: 2 },
                count: 2,
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    },
  };

  beforeAll(() => {
    for (const [cardId, compiledProbe] of Object.entries(probes)) {
      syntheticDefinitions.set(cardId, { ...getCardDefinition("BT1-009")!, cardId, nameEn: cardId, playCost: 0 });
      registerIrCard(cardId, compiledProbe);
    }
  });

  afterAll(() => {
    for (const cardId of Object.keys(probes)) {
      unregisterCard(cardId);
      delete compiledEffects[cardId];
      registeredCompiledCards.delete(cardId);
      registeredIrModules.delete(cardId);
      syntheticDefinitions.delete(cardId);
    }
  });

  async function resolveTankdramonThenPlayProbe(
    probeCardId: string,
    opponent: { battleArea: { card: string; as: string }[]; hand?: { card: string; as: string }[] },
    tankdramonDeleteAlias: string,
  ) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT16-060", as: "tank" },
            { card: probeCardId, as: "probe" },
          ],
          deck: ["BT16-050", "BT16-050", "BT16-050", "BT1-009"],
        },
        1: opponent,
      },
      { autoSelectCards: true, autoChooseOption: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm(tankdramonDeleteAlias).permanentId);
    s.state.memory = 7;
    await s.ready();
    const deleteTargetId = s.perm(tankdramonDeleteAlias).permanentId;
    const opponentBattleArea = s.state.players[1]!.battleArea;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tank").instanceId })).toEqual({ ok: true });
    await settle(() => !opponentBattleArea.some(({ permanentId }) => permanentId === deleteTargetId));
    await settle();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("probe").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    return s;
  }

  it("never reduces a play cost below 0: a cost 2 Digimon reduced by 3 has a play cost of 0 (Q2647)", async () => {
    const s = await resolveTankdramonThenPlayProbe(
      ZERO_COST_PROBE,
      {
        battleArea: [
          { card: "BT1-009", as: "costTwo" },
          { card: "BT1-010", as: "costThree" },
          { card: "BT1-020", as: "tankdramonTarget" },
          { card: "BT1-022", as: "costSeven" },
        ],
      },
      "tankdramonTarget",
    );

    // The probe deletes only play cost exactly 0. The cost 3 Digimon proves the full reduction of 3
    // applied; the cost 2 Digimon floors at 0 instead of -1; the cost 7 Digimon (now 4) survives.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-022"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-010", "BT1-020"]);
  });

  it("reduces only the play costs of Digimon in the battle area, not cards in the hand (Q2648)", async () => {
    const s = await resolveTankdramonThenPlayProbe(
      HAND_COST_PROBE,
      {
        battleArea: [
          { card: "BT1-020", as: "fieldGroundramon" },
          { card: "BT1-009", as: "tankdramonTarget" },
        ],
        hand: [
          { card: "BT1-020", as: "handGroundramon" },
          { card: "BT1-009", as: "handMonodramon" },
        ],
      },
      "tankdramonTarget",
    );
    const opponent = s.state.players[1]!;

    // The same cost 5 Groundramon reads as 2 on the field but stays 5 in the hand.
    expect(opponent.battleArea).toHaveLength(0);
    expect(opponent.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("handGroundramon").instanceId]);
    expect(opponent.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("handMonodramon").instanceId);
  });
});
