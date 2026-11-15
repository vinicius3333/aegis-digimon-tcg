import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { closeFriendshipFixture } from "./closeFriendshipFixture.js";
import { startSocialBrowserServer } from "./startSocialBrowserServer.js";

class FriendsPage {
  constructor(private readonly page: Page) {}

  async open(path: string) {
    await this.page.goto(path);
  }

  async openRequests() {
    await this.page.getByRole("button", { name: "Requests 1", exact: true }).click();
  }

  async expectNoOverflow() {
    expect(await this.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
}

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`players become friends from history and enforce blocking at ${width}px in ${dark ? "dark" : "light"} mode`, async ({
      browser,
    }) => {
      const fixture = await startSocialBrowserServer();
      const contexts: BrowserContext[] = [];
      const errors: unknown[] = [];
      try {
        const store = fixture.accounts;
        const first = await store.accountForIdentity("email", "first@test.invalid", "First Tamer");
        const second = await store.accountForIdentity("email", "second@test.invalid", "Second Tamer");
        await store.recordRecentMatch(first.id, "friends-finished-room", {
          id: "friends-finished-match",
          mode: "casual",
          opponentKind: "human",
          opponentName: second.displayName,
          opponentAccountId: second.id,
          result: "win",
          reason: "security",
          finishedAt: Date.now(),
        });
        const players = [];
        for (const account of [first, second]) {
          const session = await store.issueSession(account);
          const context = await browser.newContext({ viewport: { width, height: 1000 } });
          contexts.push(context);
          const page = await context.newPage();
          await page.addInitScript((darkMode) => {
            localStorage.setItem("aegis:locale", "en");
            localStorage.setItem("aegis:darkMode", String(darkMode));
          }, dark);
          await page.route(`http://127.0.0.1:${process.env.AEGIS_E2E_EDGE_PORT ?? 2569}/**`, async (route) => {
            const request = route.request();
            const response = await route.fetch({
              headers: { ...request.headers(), cookie: `aegis_session=${session.id}` },
            });
            await route.fulfill({ response });
          });
          players.push({ page, friends: new FriendsPage(page) });
        }
        const [sender, recipient] = players;
        if (players.length !== 2 || !sender || !recipient) {
          throw new Error("Expected both friendship players to be initialized");
        }
        await sender.friends.open("/profile");
        await sender.page.getByRole("button", { name: "Add friend", exact: true }).click();
        await expect(sender.page.getByRole("button", { name: "Request sent", exact: true })).toBeDisabled();
        await recipient.friends.open("/friends");
        await recipient.friends.openRequests();
        await expect(recipient.page.getByRole("region", { name: "Requests", exact: true })).toContainText(
          first.displayName,
        );
        await recipient.page.getByRole("button", { name: "Accept", exact: true }).click();
        await recipient.page.getByRole("button", { name: "Friends 1", exact: true }).click();
        await expect(recipient.page.getByRole("region", { name: "Friends", exact: true })).toContainText(
          first.displayName,
        );
        await sender.friends.open("/friends");
        await expect(sender.page.getByRole("region", { name: "Friends", exact: true })).toContainText(
          second.displayName,
        );
        await sender.page
          .getByRole("main")
          .getByRole("region", { name: "Friends", exact: true })
          .getByLabel(`More actions for ${second.displayName}`, { exact: true })
          .click();
        await sender.page.getByRole("menu").getByRole("menuitem", { name: "Block player", exact: true }).click();
        await sender.page.getByRole("button", { name: "Blocked 1", exact: true }).click();
        await expect(sender.page.getByRole("region", { name: "Blocked", exact: true })).toContainText(
          second.displayName,
        );
        await recipient.page.reload();
        await expect(
          recipient.page.getByRole("main").getByText("No friends yet. Add a player to get started.", { exact: true }),
        ).toBeVisible();
        await recipient.page.getByRole("textbox", { name: "Player display name" }).fill(first.displayName);
        await recipient.page.getByRole("button", { name: "Add friend", exact: true }).click();
        await expect(
          recipient.page.getByRole("main").getByRole("status").filter({ hasText: "This request is unavailable." }),
        ).toHaveText("This request is unavailable.");
        await sender.friends.expectNoOverflow();
        await recipient.friends.expectNoOverflow();
      } catch (error) {
        errors.push(error);
      } finally {
        await closeFriendshipFixture({ contexts, server: undefined, database: fixture, errors });
      }
    });
  }
}
