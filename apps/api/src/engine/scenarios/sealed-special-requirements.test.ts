import type { Intent } from "@aegis/shared/protocol/intents";
import { settle } from "#api/engine/testkit/harness";
import { mainActions } from "#api/bot/training/actions";
import { expect, it } from "vitest";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import { Phase } from "@aegis/shared/schema/enums";
import { requireCardDefinition } from "@aegis/shared/cards/registry";
import "#api/cards/index";
import { matchingAlternateDigivolutionRequirement } from "#api/engine/cards/cardData";
import { matchingDnaDigivolveCost } from "#api/engine/effects/verbs/digivolveCost";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/sealed-color-and-breeding.fixture";
import { validateDigivolve } from "#api/engine/actions/digivolve";
import { digivolveDeps } from "#api/engine/gameEngine/actionDeps";

it("waives alternate colors while retaining the illustrated level and Save text conditions", () => {
  expect(matchingAlternateDigivolutionRequirement("BT12-083", "BT10-019")).toBeUndefined();
  expect(matchingAlternateDigivolutionRequirement("BT12-083", "BT10-019", { sealed: true })?.cost).toBe(4);
  expect(matchingAlternateDigivolutionRequirement("BT12-083", "BT1-036", { sealed: true })).toBeUndefined();
  expect(matchingAlternateDigivolutionRequirement("BT12-083", "BT1-029", { sealed: true })).toBeUndefined();
});

it("waives DNA material colors while retaining both levels and exactly two materials", () => {
  const destination = requireCardDefinition("ST13-06");
  const materials = [requireCardDefinition("BT1-044"), requireCardDefinition("BT1-082")];
  expect(matchingDnaDigivolveCost(destination, materials)).toBeUndefined();
  expect(matchingDnaDigivolveCost(destination, materials, true)).toBe(0);
  expect(matchingDnaDigivolveCost(destination, [materials[0]!], true)).toBeUndefined();
  expect(
    matchingDnaDigivolveCost(destination, [materials[0]!, requireCardDefinition("BT1-029")], true),
  ).toBeUndefined();
});

it("retains explicit Hybrid effect Tamer selection colors", () => {
  expect(matchingAlternateDigivolutionRequirement("BT4-011", "BT1-086", { sealed: true })).toBeUndefined();
  expect(matchingAlternateDigivolutionRequirement("BT4-011", "BT1-085", { sealed: true })?.cost).toBe(2);
});

it.each([true, false])("applies the sealed waiver during paid=%s effect digivolution", async (payCost) => {
  const s = setupScenario(fixture);
  s.state.rulesPolicy = GameRulesPolicy.SEALED.value;
  s.state.phase = Phase.Main;
  await s.ready();
  const result = await s.engine.primitives.digivolveFromInstance(
    s.perm("blue-rookie").permanentId,
    s.inst("red-champion").instanceId,
    { payCost },
  );
  expect(result).toBeDefined();
  expect(s.perm("blue-rookie").topCard.cardId).toBe("BT1-016");
});

it("keeps constructed colors and sealed level and affordability checks", () => {
  const s = setupScenario(fixture);
  s.state.phase = Phase.Main;
  const intent = {
    type: "digivolve",
    instanceId: s.inst("red-champion").instanceId,
    permanentId: s.perm("blue-rookie").permanentId,
  } as const;
  expect(validateDigivolve(s.state, 0, intent, digivolveDeps(s.engine)).ok).toBe(false);
  s.state.rulesPolicy = GameRulesPolicy.SEALED.value;
  s.state.memory = -10;
  expect(validateDigivolve(s.state, 0, intent, digivolveDeps(s.engine))).toMatchObject({
    ok: false,
    reason: "insufficient-memory",
  });
});

it("executes a declared cross-color DNA evolution with the same material legality as action generation", async () => {
  const s = setupScenario({
    ...fixture,
    board: {
      ...fixture.board,
      0: {
        battleArea: [
          { card: "BT1-044", as: "blue-six" },
          { card: "BT1-082", as: "green-six" },
        ],
        hand: [{ card: "ST13-06", as: "dna-result" }],
        deck: Array<string>(8).fill("BT1-009"),
        security: 5,
      },
    },
  });
  s.state.rulesPolicy = GameRulesPolicy.SEALED.value;
  s.state.phase = Phase.Main;
  await s.ready();
  const before = s.state.memory;
  const intent: Intent = {
    type: "dnaDigivolve",
    materialPermanentIds: [s.perm("blue-six").permanentId, s.perm("green-six").permanentId],
    instanceId: s.inst("dna-result").instanceId,
  };
  expect(mainActions(s.engine, 0).some((action) => action.intent.type === "dnaDigivolve")).toBe(true);
  expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  expect(s.state.players[0]!.battleArea).toHaveLength(1);
  expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("ST13-06");
  expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(["BT1-082", "BT1-044"]);
  expect(s.state.memory).toBe(before);
});
