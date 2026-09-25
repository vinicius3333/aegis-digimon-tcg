import { Phase, type DecisionRequest } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { setupEngine } from "./testkit/harness.js";

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("Gate of Deadly Sins effect order dev scenario", () => {
  it("stages Gate in breeding over four [On Deletion] Digimon", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-gate-deadly-sins-effect-order", s.state, [BLUE_DECK, RED_DECK]);

    const human = s.state.players[0]!;
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.players[1]!.battleArea.map(({ enterFieldTurnCount }) => enterFieldTurnCount)).toEqual([1, 1]);
    expect(human.breeding?.topCard.cardId).toBe("EX6-006");
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([
      "BT12-085",
      "EX10-009",
      "BT25-076",
      "EX13-028",
    ]);
    expect(human.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT2-068", "BT18-082"]));
  });

  it("resolves all four deletion triggers from one planned prompt", async () => {
    const lucemon: string[] = [];
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoOrderTriggers: false, autoSelectCards: true, preferInstanceIds: lucemon },
    );
    lucemon.push("dev-gate-order-lucemon");
    s.engine.stagedDecks[0] = BLUE_DECK;
    s.engine.stagedDecks[1] = RED_DECK;
    s.engine.startDevScenario("arena-gate-deadly-sins-effect-order");

    let prompt: DecisionRequest | undefined;
    for (let step = 0; step < 400 && prompt === undefined; step += 1) {
      const passes =
        s.state.pendingDecision === undefined &&
        (s.state.phase === Phase.Breeding || (s.state.phase === Phase.Main && s.state.turnSeat === 1));
      if (passes) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")?.req;
      await tick();
    }
    expect(prompt?.seat).toBe(0);
    // The Demon Lord choice is a later step of Gate's clause, so the client keeps Gate's notice.
    const gateChoice = s.decisions.find(({ req }) => req.sourceCardId === "EX6-006")?.req;
    expect(gateChoice?.options?.effectTextPart).toMatch(/^If this effect deleted, place 1 card/);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(prompt?.options?.acceptsResolutionPlan).toBe(true);
    const keys = prompt!.options!.triggerKeys!;
    const cardIds = prompt!.options!.triggerCardIds!;
    expect([...cardIds].sort()).toEqual(["BT12-085", "BT25-076", "EX10-009", "EX13-028"]);
    const keyOf = (cardId: string): string => keys[cardIds.indexOf(cardId)]!;
    expect(prompt!.options!.triggerIsOptional![cardIds.indexOf("BT12-085")]).toBe(true);

    const order = ["EX13-028", "BT12-085", "EX10-009", "BT25-076"].map(keyOf);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt!.decisionId,
        response: {
          kind: "orderTriggers",
          order,
          optionalAnswers: { [keyOf("EX13-028")]: false, [keyOf("BT12-085")]: true },
        },
      }),
    ).toEqual({ ok: true });

    for (let step = 0; step < 400 && s.state.pendingDecision !== undefined; step += 1) await tick();
    for (let step = 0; step < 50; step += 1) await tick();

    const asked = s.decisions.filter(({ seat }) => seat === 0).map(({ req }) => req.kind);
    expect(asked.filter((kind) => kind === "orderTriggers")).toHaveLength(1);
    expect(asked).not.toContain("optional");
    const human = s.state.players[0]!;
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT2-068"]);
    expect(human.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(["dev-gate-order-reveal-first-chuumon"]),
    );
  });
});
