import type { Intent } from "@aegis/shared";
import { BotPlayer } from "../../api/dist/bot/BotPlayer.js";
import { AegisRoom } from "../../api/dist/rooms/AegisRoom.js";
import { test, expect } from "./scenario-page";

const MERVAMON = "dev-perm-1-counter-mervamon";

/**
 * Production order: the defender's client has already shown the attacker's pending decision, the
 * attacker answers, and the Counter event arrives before the state patch that clears it. Locally the
 * patch usually wins, so the bot answers after the decision is published and the next patches wait.
 */
function deliverCounterBeforeDecisionPatch(): () => void {
  const bot = BotPlayer.prototype as unknown as { act(intent: Intent): unknown };
  const room = AegisRoom.prototype as unknown as { broadcastPatch(): boolean };
  const originalAct = bot.act;
  const originalPatch = room.broadcastPatch;
  let holdPatchesUntil = 0;
  bot.act = function (intent) {
    if (intent.type !== "respondDecision") return originalAct.call(this, intent);
    setTimeout(() => {
      holdPatchesUntil = Date.now() + 600;
      originalAct.call(this, intent);
    }, 400);
  };
  room.broadcastPatch = function () {
    return Date.now() < holdPatchesUntil ? false : originalPatch.call(this);
  };
  return () => {
    bot.act = originalAct;
    room.broadcastPatch = originalPatch;
  };
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test.describe(`Gallantmon Counter after the attacker's decision at ${viewport.width}px`, () => {
    test.use({
      viewport,
      holdBotAfterTurn: 3,
      // A list option must use Playwright's [value, options] form, or it is read as that pair.
      botMainIntents: [
        [{ type: "attack", attackerPermanentId: MERVAMON, target: { kind: "player" } }, { type: "endPhase" }],
        { scope: "test" },
      ],
      // As in the reported match, the attacker declines Elecmon's inherited prompt right before Counter Timing.
      botOptionalScript: { sourceCardId: "BT24-031", answers: [false] },
    });
    let restore: (() => void) | undefined;
    test.afterEach(() => restore?.());

    test("Discord 1558162472945586388: the Counter rail opens right after the attacker's decision", async ({
      scenario,
    }) => {
      const { page } = scenario;
      restore = deliverCounterBeforeDecisionPatch();
      await scenario.open("arena-ex13-gallantmon-counter-after-opponent-decision");
      await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
      await page.getByRole("button", { name: /^End turn$/i }).click();

      const rail = page.getByRole("dialog", { name: "Counter timing" });
      await expect(rail).toBeVisible();
      await expect(rail).toContainText("Gallantmon");
      // The rail is up before the held patch lands; the synchronized state catches up afterwards.
      await expect
        .poll(async () => {
          const state = await scenario.snapshot();
          return { window: state.combatWindow, pending: state.pendingDecision };
        })
        .toMatchObject({
          window: { kind: "counter", seat: 0, attackerPermanentId: MERVAMON },
          pending: undefined,
        });
      await expect(rail).toBeVisible();

      await rail.getByRole("button", { name: /activate/i }).click();
      await expect(rail).toHaveCount(0);
      await scenario.resolveUntil(
        (s) =>
          !s.combatWindow && !s.pendingDecision && !s.players[1]!.battleArea.some((p) => p.permanentId === MERVAMON),
      );
      const after = await scenario.snapshot();
      expect(after.players[0]!.security).toHaveLength(5);
      expect(after.players[1]!.trash.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT26-081", "BT24-031"]),
      );
      await scenario.healthy();
    });
  });
}
