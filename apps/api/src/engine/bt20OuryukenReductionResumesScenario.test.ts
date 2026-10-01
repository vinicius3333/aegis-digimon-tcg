import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

async function startScenario() {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-bt20-ouryuken-reduction-resumes");
  const human = s.state.players[0]!;
  const bot = s.state.players[1]!;
  const chronomon = () => bot.battleArea.find((permanent) => permanent.permanentId === "dev-perm-1-ouryuken-chronomon");
  const ouryukenInPlay = () =>
    human.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-060") &&
    s.state.pendingDecision === undefined;
  // A breeding area holding only a Digi-Egg has no breeding action, so the turn opens Main.
  await advance(s.engine).waitForMainPhase(0);
  await settle(() => s.state.pendingDecision === undefined);
  expect(observe(s.engine).isRestricted(chronomon()!, "dpImmune")).toBe(true);
  return { s, human, bot, chronomon, ouryukenInPlay };
}

describe("BT20 Alphamon: Ouryuken Discord arena scenario (Discord 1555069212727185488)", () => {
  it("plays Ouryuken for 0 with King Drasil and applies the blocked -15000 on the bot's turn once BT26-029's protection ends", async () => {
    const { s, bot, chronomon, ouryukenInPlay } = await startScenario();
    try {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-ouryuken" })).toEqual({ ok: true });
      await settle(ouryukenInPlay);
      expect(s.state.memory).toBe(3);
      expect(chronomon()?.currentDP).toBe(12000);

      advance(s.engine).endMainPhaseIfOpen(0);
      await settle(() => s.state.turnSeat === 1 && chronomon() === undefined);
      expect(bot.trash.map(({ cardId }) => cardId)).toContain("BT26-016");
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("plays Ouryuken from King Drasil's digivolution cards with Royal Knights of the Purge, whose rule keeps its [On Play] from activating", async () => {
    const { s, human, chronomon, ouryukenInPlay } = await startScenario();
    try {
      const purge = human.battleArea.find(({ topCard }) => topCard.cardId === "BT13-110")!;
      const delay = (
        JSON.parse(purge.activatableEffectsJson || "[]") as { effectKey: string; description?: string }[]
      ).find(({ description }) => description?.includes("Delay"));
      expect(delay).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: purge.topCard.instanceId,
          effectKey: delay!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(ouryukenInPlay);
      expect(human.breeding?.stack.some(({ cardId }) => cardId === "BT20-060")).toBe(false);
      expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT20-060")).toBe(
        false,
      );
      expect(chronomon()?.currentDP).toBe(12000);

      advance(s.engine).endMainPhaseIfOpen(0);
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(observe(s.engine).isRestricted(chronomon()!, "dpImmune")).toBe(false);
      expect(chronomon()?.currentDP).toBe(12000);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});
