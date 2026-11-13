import { Phase } from "@aegis/shared/schema/enums";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/preset-activation-keeps-after-cost-placement-optional.fixture";
import "#api/cards/index";

const placementPrompt = "Place 1 card(s) under";
const twoCardPlacementPrompt = "Place 2 card(s) under";

function respond(s: EngineSetup, response: Parameters<EngineSetup["engine"]["applyIntent"]>[1]) {
  expect(s.engine.applyIntent(0, response)).toEqual({ ok: true });
}

function presetActivation(s: EngineSetup, alias: string, accept: boolean) {
  const options = s.state.pendingDecision!;
  const request = s.decisions.at(-1)!.req;
  const key = request.options!.triggerKeys!.find((offered) => offered.startsWith(s.inst(alias).instanceId))!;
  respond(s, {
    type: "respondDecision",
    decisionId: options.decisionId,
    response: { kind: "orderTriggers", order: [key], optionalAnswers: { [key]: accept } },
  });
}

async function answerPlacement(s: EngineSetup, accept: boolean, prompt = placementPrompt) {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  expect(s.state.pendingDecision!.promptText).toBe(prompt);
  respond(s, {
    type: "respondDecision",
    decisionId: s.state.pendingDecision!.decisionId,
    response: { kind: "optional", accept },
  });
}

async function attackUntilTamersAreOrdered(verify: (s: EngineSetup) => Promise<void>) {
  const s = setupScenario(fixture, { autoOrderTriggers: false });
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    respond(s, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(0);
    respond(s, {
      type: "attack",
      attackerPermanentId: s.perm("gaogamon").permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    await verify(s);
  } finally {
    if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "surrender" });
    await loop;
  }
}

describe("a preset activation keeps the placement after the suspend cost optional", () => {
  it("suspends the Tamer and protects the Gaogamon when the deck placement is declined", async () => {
    await attackUntilTamersAreOrdered(async (s) => {
      presetActivation(s, "firstThomas", true);
      await answerPlacement(s, false);
      await settle(() => observe(s.engine).isRestricted(s.perm("gaogamon"), "beDeletedInBattle"));

      expect(s.perm("firstThomas").isSuspended).toBe(true);
      expect(s.perm("firstThomas").stack).toHaveLength(0);
      expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("attackDraw").instanceId);
    });
  });

  it("places the deck top face down when the placement is accepted", async () => {
    await attackUntilTamersAreOrdered(async (s) => {
      presetActivation(s, "firstThomas", true);
      await answerPlacement(s, true);
      await settle(() => observe(s.engine).isRestricted(s.perm("gaogamon"), "beDeletedInBattle"));

      expect(s.perm("firstThomas").isSuspended).toBe(true);
      expect(s.perm("firstThomas").stack.map((card) => [card.instanceId, card.faceUp])).toEqual([
        [s.inst("deckTop").instanceId, false],
      ]);
      expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckSecond").instanceId);
    });
  });

  it("does nothing for a Tamer whose activation is preset to no", async () => {
    await attackUntilTamersAreOrdered(async (s) => {
      presetActivation(s, "firstThomas", false);
      await settle(() => s.state.pendingDecision?.kind === "optional");

      expect(s.state.pendingDecision!.promptText).not.toBe(placementPrompt);
      expect(s.perm("firstThomas").isSuspended).toBe(false);
      expect(s.perm("firstThomas").stack).toHaveLength(0);
      expect(observe(s.engine).isRestricted(s.perm("gaogamon"), "beDeletedInBattle")).toBe(false);
      expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
    });
  });

  it.each([
    ["BT27-094", true],
    ["BT27-094", false],
    ["BT27-097", true],
    ["BT27-097", false],
  ] as const)("asks %s for its two-card placement after the suspend cost: accepted %s", async (tamer, accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: tamer, as: "firstTamer" },
            { card: tamer, as: "secondTamer" },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: [
            { card: "BT1-009", as: "deckTop" },
            { card: "BT1-011", as: "deckSecond" },
            { card: "BT1-012", as: "deckThird" },
          ],
        },
      },
      { autoOrderTriggers: false },
    );
    await s.ready();
    void advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    presetActivation(s, "firstTamer", true);
    await answerPlacement(s, accept, twoCardPlacementPrompt);
    await settle(() => s.state.pendingDecision?.promptText !== twoCardPlacementPrompt);

    expect(s.perm("firstTamer").isSuspended).toBe(true);
    expect(s.perm("firstTamer").stack.map((card) => [card.instanceId, card.faceUp])).toEqual(
      accept
        ? [
            [s.inst("deckSecond").instanceId, false],
            [s.inst("deckTop").instanceId, false],
          ]
        : [],
    );
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst(accept ? "deckThird" : "deckTop").instanceId);
    expect(s.perm("secondTamer").isSuspended).toBe(false);
  });
});
