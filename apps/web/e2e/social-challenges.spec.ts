import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { startSocialBrowserServer } from "./startSocialBrowserServer";
import { FriendStore } from "../../api/dist/friends/FriendStore.js";

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`a friend challenge opens the private match at ${width}px in ${dark ? "dark" : "light"} mode`, async ({
      browser,
    }) => {
      const server = await startSocialBrowserServer();
      const contexts = [];
      try {
        const first = await server.accounts.accountForIdentity("email", "host@test.invalid", "Challenge Host");
        const second = await server.accounts.accountForIdentity("email", "guest@test.invalid", "Challenge Guest");
        const watcher = await server.accounts.accountForIdentity("email", "watcher@test.invalid", "Friendly Watcher");
        const friends = new FriendStore(server.accounts);
        for (const account of [first, second]) {
          await server.accounts.updatePreferences(account.id, {
            spectatorAccess: "friends",
            hideIdentityFromSpectators: account.id === first.id,
          });
          await friends.request({ accountId: watcher.id, displayName: account.displayName });
          await friends.accept({ accountId: account.id, otherId: watcher.id });
        }
        await friends.request({ accountId: first.id, displayName: second.displayName });
        await friends.accept({ accountId: second.id, otherId: first.id });
        const players = [];
        for (const account of [first, second, watcher]) {
          const session = await server.accounts.issueSession(account);
          const context = await browser.newContext({ viewport: { width, height: 1000 } });
          contexts.push(context);
          await context.addCookies([{ name: "aegis_session", value: session.id, domain: "127.0.0.1", path: "/" }]);
          await context.addInitScript((darkMode) => {
            localStorage.setItem("aegis:locale", "en");
            localStorage.setItem("aegis:darkMode", String(darkMode));
          }, dark);
          const page = await context.newPage();
          await page.goto(`http://127.0.0.1:${process.env.AEGIS_E2E_WEB_PORT ?? 4175}/friends`);
          await expect(page.locator("#aegis-main").getByText("Connected to friends", { exact: true })).toBeVisible();
          players.push(page);
        }
        const [host, guest, spectator] = players;
        if (players.length !== 3 || !host || !guest || !spectator) {
          throw new Error("Expected the challenge host, guest, and spectator to be initialized");
        }
        await expect(host.locator("#aegis-main").getByText("Online", { exact: true })).toHaveCount(2);
        await host.screenshot({
          path: fileURLToPath(
            new URL(
              `../../../.local/validation/phase2-friends-${width}-${dark ? "dark" : "light"}.png`,
              import.meta.url,
            ),
          ),
        });
        await host
          .getByRole("listitem")
          .filter({ hasText: "Challenge Guest" })
          .getByRole("button", { name: "Challenge", exact: true })
          .click();
        await expect(host.getByRole("status").filter({ hasText: "Challenge Challenge Guest" })).toBeVisible();
        await host.getByRole("button", { name: /^create room$/i }).click();
        await expect(guest.getByText("Challenge Host invited you to a match", { exact: true })).toBeVisible();
        await guest.screenshot({
          path: fileURLToPath(
            new URL(
              `../../../.local/validation/phase2-invite-${width}-${dark ? "dark" : "light"}.png`,
              import.meta.url,
            ),
          ),
        });
        expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await guest.getByRole("button", { name: "Join match", exact: true }).click();
        await expect(host).toHaveURL(/\/play\/game$/);
        await expect(guest).toHaveURL(/\/play\/game$/);
        await expect(guest.getByRole("button", { name: "Challenge Host", exact: true })).toBeVisible();
        await expect(host.getByRole("button", { name: "Challenge Guest", exact: true })).toBeVisible();
        await spectator
          .getByRole("listitem")
          .filter({ hasText: "Challenge Guest" })
          .getByRole("button", { name: "Watch", exact: true })
          .click();
        await expect(spectator).toHaveURL(/\/play\/game$/);
        await expect(spectator.getByRole("button", { name: "Keep hand", exact: true })).toHaveCount(0);
        await expect(spectator.getByRole("button", { name: "Challenge Host", exact: true })).toHaveCount(0);
        await Promise.all(
          [host, guest].map((page) => page.getByRole("button", { name: "Keep hand", exact: true }).click()),
        );
        if (width < 600) {
          await host.getByLabel("Match menu", { exact: true }).click();
        }
        await host.getByRole("button", { name: "Surrender", exact: true }).click();
        await host
          .getByRole("dialog", { name: "Surrender this match?" })
          .getByRole("button", { name: "Surrender", exact: true })
          .click();
        const readSavedReplay = async () => {
          return spectator.evaluate(async () => {
            const modulePath = "/src/replays/local.ts";
            const { unsyncedLocalReplays } = await import(modulePath);
            const replays: unknown = await unsyncedLocalReplays();
            if (!Array.isArray(replays)) {
              throw new Error("Expected the local replay list");
            }
            const replay: unknown = replays.find(
              (entry: unknown) =>
                typeof entry === "object" && entry !== null && "viewerSeat" in entry && entry.viewerSeat === -1,
            );
            if (replay === undefined) {
              return undefined;
            }
            if (
              typeof replay !== "object" ||
              replay === null ||
              !("data" in replay) ||
              typeof replay.data !== "string" ||
              ("indexId" in replay && replay.indexId !== undefined && typeof replay.indexId !== "string")
            ) {
              throw new Error("Expected a saved spectator replay with encoded data");
            }
            return { data: replay.data, indexId: "indexId" in replay ? replay.indexId : undefined };
          });
        };
        await expect.poll(async () => Boolean((await readSavedReplay())?.indexId)).toBe(true);
        const saved = await readSavedReplay();
        if (!saved || !saved.indexId) {
          throw new Error("Expected the saved spectator replay to have an account library entry");
        }
        const replay = JSON.parse(gunzipSync(Buffer.from(saved.data, "base64")).toString());
        expect(replay.viewerSeat).toBe(-1);
        expect(replay.players).not.toContain("Challenge Host");
        const guestSeat = replay.players.indexOf("Challenge Guest");
        expect(replay.visibleHandSeats).toEqual([guestSeat]);
        for (const frame of replay.frames) {
          expect(frame.state.players[1 - guestSeat].hand).toEqual([]);
        }
        expect(
          (
            await server.accounts.pool.query("SELECT viewer_seat FROM account_replays WHERE id=$1 AND account_id=$2", [
              saved.indexId,
              watcher.id,
            ])
          ).rows,
        ).toEqual([{ viewer_seat: -1 }]);
      } finally {
        for (const context of contexts) {
          await context.close();
        }
        await server.close();
      }
    });
  }
}
