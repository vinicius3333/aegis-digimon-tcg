import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { test, expect } from "@playwright/test";
import type { MatchHistoryPage } from "@aegis/shared";

// Exercise the compiled production account routes/store, not a duplicate browser stats mock.
const requireApi = createRequire(new URL("../../api/package.json", import.meta.url));
const express = requireApi("express");
const { newDb } = requireApi("pg-mem");
const apiModule = (name: string) => import(new URL(`../../api/dist/${name}.js`, import.meta.url).href);

for (const [width, dark] of [
  [390, false],
  [1440, true],
] as const) {
  test(`human win rate follows filters across pages at ${width}px`, async ({ page }) => {
    const { AccountStore } = await apiModule("accounts/AccountStore");
    const { installAccountRoutes } = await apiModule("accounts/routes");
    const store = new AccountStore(new (newDb({ noAstCoverageCheck: true }).adapters.createPg().Pool)());
    const app = express();
    app.use(express.json());
    installAccountRoutes(app, store);
    const owner = await store.accountForIdentity("email", "rate@test.invalid", "Rate Tamer");
    const session = await store.issueSession(owner);
    await store.updatePreferences(owner.id, { profileStats: true });
    // Three eligible human games (one of each result), then 26 bot wins fill the first page.
    for (let index = 0; index < 29; index++) {
      await store.recordRecentMatch(owner.id, `rate-room-${index}`, {
        id: `rate-match-${index}`,
        mode: index < 3 ? "casual" : index === 3 ? "tournament" : "bot",
        opponentKind: index < 3 || index === 4 ? "human" : "bot",
        opponentName: index < 3 ? "Human Rival" : "Agumon Bot",
        result: index === 1 ? "loss" : index === 2 ? "draw" : "win",
        reason: "surrender",
        finishedAt: Date.UTC(2026, 9, 11) + index * 1000,
      });
    }
    const { ReplayLibrary } = await apiModule("replays/ReplayLibrary");
    const library = new ReplayLibrary(store);
    const replayId = await library.record(owner.id, {
      kind: "ready",
      viewerSeat: 0,
      data: Buffer.from("archive").toString("base64"),
      summary: {
        id: "rate-match-28",
        players: ["Rate Tamer", "Agumon Bot"],
        mode: "bot",
        startedAt: 1,
        finishedAt: 2,
        winnerSeat: 0,
        frameCount: 1,
      },
    });
    await library.attachDrive(owner.id, replayId, "rateBotDriveFile");
    const other = await store.accountForIdentity("email", "other@test.invalid", "Other Tamer");
    await store.recordRecentMatch(other.id, "other-room", {
      id: "other-match",
      mode: "casual",
      opponentKind: "human",
      opponentName: "Human Rival",
      result: "win",
      reason: "surrender",
      finishedAt: Date.now(),
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
      await page.addInitScript((darkMode) => {
        localStorage.setItem("aegis:locale", "en");
        localStorage.setItem("aegis:darkMode", String(darkMode));
      }, dark);
      // Only forward browser HTTP to the real route harness and give it the issued session.
      await page.route(/\/(?:account\/|auth\/me)/, async (route) => {
        const request = route.request();
        if (!["fetch", "xhr"].includes(request.resourceType())) return route.fallback();
        const url = new URL(request.url());
        const response = await route.fetch({
          url: `${origin}${url.pathname}${url.search}`,
          headers: { ...request.headers(), cookie: `aegis_session=${session.id}` },
        });
        await route.fulfill({ response });
      });
      await page.goto("/profile");
      const identity = page.getByRole("region", { name: "My profile" });
      const rate = identity.getByText("Win rate", { exact: true }).locator("..").locator("dd");
      await expect(rate).toHaveText("33%");
      await expect(identity.getByText("Recent human matches", { exact: true }).locator("..")).toContainText("3");
      await expect(page.getByText("Showing 1–25 of 29")).toBeVisible();
      await expect(page.getByText("Agumon Bot", { exact: true })).toHaveCount(25);
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByText("Showing 26–29 of 29")).toBeVisible();
      await expect(rate).toHaveText("33%");
      await page.getByRole("button", { name: "Wins", exact: true }).click();
      await expect(page.getByText("Showing 1–25 of 27")).toBeVisible();
      await expect(rate).toHaveText("33%");
      await page.getByRole("combobox", { name: "Mode" }).selectOption("casual");
      await expect(page.getByText("Showing 1–1 of 1")).toBeVisible();
      await expect(rate).toHaveText("33%");
      await page.getByRole("combobox", { name: "Mode" }).selectOption("bot");
      await expect(page.getByText("Showing 1–25 of 25")).toBeVisible();
      await expect(rate).toHaveText("—");
      await expect(page.getByRole("link", { name: "Watch: Agumon Bot" })).toHaveAttribute(
        "href",
        `/replays/${replayId}`,
      );
      await page.getByRole("button", { name: "Clear filters", exact: true }).click();
      await page.getByRole("searchbox", { name: "Opponent" }).fill("human rival");
      await expect(page.getByText("Showing 1–3 of 3")).toBeVisible();
      await expect(rate).toHaveText("33%");
      await page.getByRole("searchbox", { name: "Opponent" }).fill("nobody");
      await expect(page.getByText("No matches fit these filters.")).toBeVisible();
      await expect(rate).toHaveText("—");
      const response = await fetch(`${origin}/account/matches?result=win&page=2&limit=1`, {
        headers: { Cookie: `aegis_session=${session.id}` },
      });
      const body = (await response.json()) as MatchHistoryPage;
      expect(body.winRate).toEqual({ matches: 3, wins: 1, losses: 1, draws: 1 });
      expect(body.total).toBe(27);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await store.close();
    }
  });
}
