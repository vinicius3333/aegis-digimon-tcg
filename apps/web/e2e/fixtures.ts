import { test as base, expect, type Page } from "@playwright/test";
import { RED_DECK, BLUE_DECK } from "../../api/dist/engine/testDecks.js";
import { joinHeadlessOpponent, type HeadlessOpponent } from "../test/scenarioHarness/headlessOpponent";
import { startBrowserServer } from "./server";

class BrowserMatch {
  opponent!: HeadlessOpponent;
  constructor(
    readonly page: Page,
    readonly server: Awaited<ReturnType<typeof startBrowserServer>>,
  ) {}
  async start(scenario: "dna" | "reconnect" | "security") {
    const mainDeck = RED_DECK.mainDeck.map((id: string) => {
      if (scenario === "reconnect" && id === "BT1-013") return "EX11-069";
      if (scenario === "dna" && id === "BT1-015") return "BT1-051";
      if (scenario === "dna" && id === "BT1-016") return "BT16-012";
      return id;
    });
    await this.page.addInitScript(
      (options) => {
        localStorage.setItem("aegis:locale", "en");
        window.browserTestOptions = options;
      },
      {
        displayName: "Browser Protagonist",
        deck: { mainDeck, eggDeck: [...RED_DECK.eggDeck] },
        seed: scenario === "dna" ? 6 : 2,
        ...(scenario === "security" ? { devScenario: "security-chain" as const } : {}),
      },
    );
    await this.page.goto("/e2e/harness.html");
    if (scenario === "security") return;
    await expect(this.page.getByText(/finding an opponent/i)).toBeVisible();
    this.opponent = await joinHeadlessOpponent("ws://127.0.0.1:2569", {
      displayName: "Observer Opponent",
      deck: BLUE_DECK,
    });
    this.opponent.room.onMessage("event", () => {});
    this.opponent.onDecision((request) => {
      if (request.kind === "mulligan") this.opponent.mulligan(true);
    });
    if (scenario === "dna") {
      this.opponent.room.onStateChange((state) => {
        if (state.turnSeat === 1 && !state.pendingDecision && (state.phase === "Breeding" || state.phase === "Main")) {
          this.opponent.endPhase();
        }
      });
    }
    this.opponent.ready();
    await this.page.getByRole("button", { name: /keep hand/i }).click();
  }
  state() {
    return this.opponent.room.state;
  }
  async snapshot() {
    return this.page.evaluate(() => window.browserTestSnapshot());
  }
}

export const test = base.extend<{ match: BrowserMatch }>({
  match: async ({ page }, use) => {
    const server = await startBrowserServer();
    const match = new BrowserMatch(page, server);
    try {
      await use(match);
    } finally {
      try {
        await page.close();
      } finally {
        try {
          if (match.opponent) await match.opponent.leave();
        } finally {
          await server.close();
        }
      }
    }
  },
});
export { expect };
