import { RED_DECK } from "../../api/dist/engine/testDecks.js";
import { test, expect } from "./fixtures";
import { GamePage } from "./game-page";

type CardSnapshot = { instanceId: string; cardId: string };
type Snapshot = {
  players: {
    hand: CardSnapshot[];
    battleArea: { topCard: CardSnapshot; stack: CardSnapshot[] }[];
    securityCount: number;
  }[];
  combatWindow?: { kind: string };
  pendingDecision?: { kind: string };
};

for (const width of [320, 390, 768, 1024, 1440]) {
  test.describe(`Ouryuken Counter at ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } });

    test("Discord 1556343982546755625: activates Blast DNA from the rail with duplicate hand copies", async ({
      page,
      match,
    }) => {
      await page.addInitScript(
        (options) => {
          localStorage.setItem("aegis:locale", "en");
          window.browserTestOptions = options;
        },
        {
          displayName: "zeroxbass",
          deck: { mainDeck: [...RED_DECK.mainDeck], eggDeck: [...RED_DECK.eggDeck] },
          seed: 1,
          devScenario: "arena-bt20-ouryuken-blast-dna-counter" as const,
        },
      );
      await page.goto("/e2e/harness.html");
      const game = new GamePage(page);
      await game.endBreeding();
      await page.getByRole("button", { name: /^end phase$/i }).click();
      await page.getByRole("button", { name: /^don't use$/i }).click();
      await page
        .getByRole("region", { name: "Grademon · effect" })
        .getByRole("button", { name: /^don't use$/i })
        .click();
      const rail = page.getByRole("region", { name: "Counter timing" });
      await expect(rail).toBeVisible();
      // Select the second ACE; identical partner copies share one concise action.
      await page
        .getByTestId("hand")
        .getByRole("button", { name: /Pick Alphamon: Ouryuken/ })
        .nth(1)
        .click();
      const blast = rail.getByRole("button", { name: "Blast DNA", exact: true });
      await expect(blast).toHaveCount(1);
      await expect(blast).toBeVisible();
      const screenshotPath = test.info().outputPath("counter-rail.png");
      await page.screenshot({ path: screenshotPath });
      await test.info().attach("counter-rail", { path: screenshotPath, contentType: "image/png" });
      await blast.click();
      await expect(rail).toHaveCount(0);
      await expect
        .poll(async () => {
          const state = (await match.snapshot()) as Snapshot;
          return state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-ouryuken-ace-2");
        })
        .toBe(true);
      await expect
        .poll(async () => {
          const state = (await match.snapshot()) as Snapshot;
          return {
            attackerCount: state.players[1]!.battleArea.length,
            ownSecurity: state.players[0]!.securityCount,
            botSecurity: state.players[1]!.securityCount,
            pending: state.pendingDecision?.kind,
            window: state.combatWindow?.kind,
          };
        })
        .toEqual({ attackerCount: 0, ownSecurity: 6, botSecurity: 4, pending: undefined, window: undefined });
      const final = (await match.snapshot()) as Snapshot;
      const hand = final.players[0]!.hand.map(({ instanceId }) => instanceId);
      expect(hand).toContain("dev-ouryuken-ace-1");
      expect(hand).toContain("dev-ouryuken-partner-2");
      expect(hand).not.toContain("dev-ouryuken-ace-2");
      expect(hand).not.toContain("dev-ouryuken-partner-1");
      const result = final.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === "dev-ouryuken-ace-2")!;
      expect(result.stack[0]!.instanceId).toBe("dev-ouryuken-partner-1");
    });
  });
}
