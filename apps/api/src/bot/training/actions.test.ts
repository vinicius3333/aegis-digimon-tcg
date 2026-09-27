import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { breedingActions, mainActions } from "./actions.js";
import { TRAINING_DECK_VERSIONS, trainingDeck } from "./decks.js";
import "../../cards/index.js";

describe("BT26 training main and breeding actions", () => {
  it("declares an alternate Glowing Dawn evolution through the real engine", async () => {
    const setup = setupEngine(
      {
        0: { hand: [{ card: "BT26-025", as: "rookie" }], breeding: { card: "ST23-01", as: "egg" }, deck: ["BT25-032"] },
      },
      { autoDeclineOptional: true },
    );
    setup.state.memory = 3;
    await setup.ready();
    const actions = mainActions(setup.engine, 0);
    const alternate = actions.find(
      ({ intent }) =>
        intent.type === "digivolve" &&
        intent.instanceId === setup.inst("rookie").instanceId &&
        intent.alternateRequirementIndex === 0,
    );
    expect(alternate).toBeDefined();
    expect(setup.engine.applyIntent(0, alternate!.intent)).toEqual({ ok: true });
    await settle(() => setup.perm("egg").topCard.cardId === "BT26-025");
    expect(setup.perm("egg").topCard.cardId).toBe("BT26-025");
    expect(setup.state.players[0]!.hand.some((card) => card.cardId === "BT25-032")).toBe(true);
  });

  it("offers the Negamon breeding Main ability and resolves its play and transfer", async () => {
    const setup = setupEngine(
      { 0: { breeding: { card: "EX9-005", as: "egg" }, hand: ["EX9-046"], deck: ["EX9-047", "EX9-057", "LM-031"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    setup.state.memory = 3;
    await setup.ready();
    const effect = mainActions(setup.engine, 0).find(
      ({ intent }) =>
        intent.type === "activateEffect" && intent.sourceInstanceId === setup.perm("egg").topCard.instanceId,
    );
    expect(effect).toBeDefined();
    expect(mainActions(setup.engine, 0).some(({ intent }) => intent.type === "digivolve")).toBe(false);
    expect(setup.engine.applyIntent(0, effect!.intent)).toEqual({ ok: true });
    await settle(() => setup.state.players[0]!.breeding === undefined);
    const played = setup.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX9-046");
    expect(played?.stack.some((card) => card.cardId === "EX9-005")).toBe(true);
    expect(setup.state.players[0]!.breeding).toBeUndefined();
  });

  it("offers skip alongside hatch and movement, without moving a DP-less egg", async () => {
    const setup = setupEngine({ 0: { eggDeck: ["ST23-01"] } });
    setup.state.phase = Phase.Breeding;
    await setup.ready();
    expect(breedingActions(setup.engine, 0).map((action) => action.intent.type)).toEqual(["endPhase", "hatchEgg"]);
    expect(setup.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    expect(breedingActions(setup.engine, 0).some(({ intent }) => intent.type === "moveFromBreeding")).toBe(false);
  });

  it("fails the scope gate if a pinned list gains an unimplemented declaration family", () => {
    const cards = new Set(
      TRAINING_DECK_VERSIONS.flatMap((version) => {
        const { deck } = trainingDeck(version);
        return [...deck.mainDeck, ...deck.eggDeck];
      }),
    );
    for (const cardId of cards) {
      const compiled = runtimeCompiledCard(cardId);
      expect({ cardId, registered: compiled !== undefined }).toEqual({ cardId, registered: true });
      for (const key of [
        "dnaDigivolveRequirement",
        "appFusionRequirement",
        "linkRequirement",
        "digiXrosRequirement",
        "assemblyRequirement",
        "mindLinkRequirement",
      ] as const) {
        expect({ cardId, key, requirements: compiled?.[key] ?? [] }).toEqual({ cardId, key, requirements: [] });
      }
    }
  });
});
