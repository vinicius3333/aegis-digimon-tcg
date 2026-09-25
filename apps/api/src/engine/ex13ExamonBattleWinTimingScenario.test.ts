import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { settle, setupEngine } from "./testkit/harness.js";

describe("EX13 Examon win-battle timing dev scenario", () => {
  it("orders the win-battle trigger together with the attack's suspend and When Attacking triggers (Q7366)", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: false },
    );
    layDevScenario("arena-ex13-examon-battle-win-timing", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    const [human, opponent] = [s.state.players[0]!, s.state.players[1]!];
    const wingdramon = human.battleArea.find(({ topCard }) => topCard.cardId === "EX13-021")!;
    const groundramon = human.battleArea.find(({ topCard }) => topCard.cardId === "EX13-041")!;
    const examon = human.hand.find(({ cardId }) => cardId === "EX13-045")!;
    expect(wingdramon.stack.map(({ cardId }) => cardId)).toEqual(["EX13-005"]);
    expect(opponent.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-013"]);

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [groundramon.permanentId, wingdramon.permanentId],
        instanceId: examon.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision?.kind === "orderTriggers");

    expect(
      s.events.some(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "EX13-045" && event.timing === "whenBattleWon",
      ),
    ).toBe(false);
    const order = s.decisions.find(({ req }) => req.kind === "orderTriggers")?.req;
    expect([...(order?.options?.triggerCardIds ?? [])].sort()).toEqual(
      expect.arrayContaining(["EX13-005", "EX13-021", "EX13-045"]),
    );
  });
});
