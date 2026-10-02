import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("bug 1555206206417674281 follow-up: Tactimon does not prevent a DigiXros material from leaving", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-ex10-tactimon-digixros-material");
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    const human = s.state.players[0]!;
    expect(s.state.memory).toBe(12);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: "dev-tactimon-bagramon",
        digiXros: { materialInstanceIds: ["dev-field-0-skull-knightmon"] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some(({ topCard }) => topCard.instanceId === "dev-tactimon-bagramon") &&
        s.state.pendingDecision === undefined,
    );

    expect(s.decisions.map(({ req }) => req.sourceCardId)).not.toContain("EX10-055");
    expect(s.state.memory).toBe(1);
    const bagramon = human.battleArea.find(({ topCard }) => topCard.instanceId === "dev-tactimon-bagramon")!;
    expect(bagramon.stack.map(({ instanceId }) => instanceId)).toEqual(["dev-field-0-skull-knightmon"]);
    expect(human.battleArea.some(({ permanentId }) => permanentId === "dev-perm-0-skull-knightmon")).toBe(false);
    const tactimon = human.battleArea.find(({ topCard }) => topCard.instanceId === "dev-field-0-tactimon")!;
    expect(tactimon.stack.map(({ instanceId }) => instanceId)).toEqual([
      "dev-stack-0-tactimon-0",
      "dev-stack-0-tactimon-1",
    ]);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
