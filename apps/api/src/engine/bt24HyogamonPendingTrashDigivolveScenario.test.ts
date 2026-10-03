import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("Discord 1555502942403043389: Hyogamon still digivolves Plutomon into the ZombiePlutomon it trashed", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: ["dev-hyogamon-plutomon", "dev-hyogamon-fugamon", "dev-hyogamon-zombie-plutomon"],
    },
  );
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-bt24-hyogamon-pending-trash-digivolve");
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);

    const human = s.state.players[0]!;
    const host = human.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-hyogamon-host")!;
    const snowGoblimon = human.hand.find(({ instanceId }) => instanceId === "dev-hyogamon-snowgoblimon")!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: snowGoblimon.instanceId })).toEqual({ ok: true });
    await settle(() => host.topCard.cardId === "BT26-079" && s.state.pendingDecision === undefined);

    expect(host.topCard.instanceId).toBe("dev-hyogamon-zombie-plutomon");
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["BT26-066", "BT24-026", "BT26-074", "BT26-059"]);
    expect(human.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT24-013");
    const waitingLists = s.decisions
      .filter(({ req }) => req.kind === "orderTriggers")
      .map(({ req }) => req.options?.waitingTriggerCardIds ?? []);
    expect(waitingLists).toContainEqual(["BT24-026"]);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
