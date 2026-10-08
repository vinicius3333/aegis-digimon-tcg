import { gzipSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import { replayFixture } from "../test/replays/fixture";

const id = "11111111-1111-4111-8111-111111111111";
const recording = replayFixture();
const archive = gzipSync(JSON.stringify(recording));
const saved = {
  id,
  summary: recording,
  viewerSeat: 0,
  bytes: archive.length,
  savedAt: Date.now(),
  status: "ready",
  visibility: "private",
};
const account = { id: "account-id", displayName: "Vinicius", avatarUrl: null, avatarId: null, isAdmin: false };
async function setup(page: import("@playwright/test").Page) {
  let visibility = "private";
  await page.route("**/auth/me", (route) => route.fulfill({ json: account }));
  await page.route("**/account/decks", (route) => route.fulfill({ json: [] }));
  await page.route("**/account/preferences", (route) => route.fulfill({ json: {} }));
  await page.route("**/account/profile", (route) =>
    route.fulfill({
      json: {
        account,
        stats: {},
        decks: [],
        matches: Array.from({ length: 12 }, (_, index) => ({
          id: `match-${index}`,
          mode: index % 2 ? "bot" : "casual",
          opponentName: index === 0 ? "Gabumon Player" : `Opponent ${index}`,
          result: index % 3 ? "loss" : "win",
          finishedAt: Date.now() - index * 60000,
          replay: index < 3 ? { ...saved, visibility } : null,
        })),
      },
    }),
  );
  await page.route("**/account/replays**", (route) => {
    if (route.request().url().endsWith("/visibility")) {
      visibility = route.request().postDataJSON().visibility;
      return route.fulfill({ json: { ...saved, visibility } });
    }
    if (route.request().url().endsWith("/file"))
      return route.fulfill({ contentType: "application/gzip", body: archive });
    return route.fulfill({ json: { enabled: true, limit: 10, replays: [{ ...saved, visibility }] } });
  });
  await page.route(`**/replays/${id}/file`, (route) =>
    route.fulfill({ contentType: "application/gzip", body: archive }),
  );
}
test.describe.configure({ mode: "parallel" });
for (const width of [320, 768, 1024, 1440])
  test(`profile history and sharing at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page);
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
    await expect(page.locator(".profile-matches > li")).toHaveCount(10);
    await expect(page.getByText("Replay not saved", { exact: true })).toHaveCount(7);
    const first = page.locator(".profile-matches > li").first();
    await first.getByRole("button", { name: "Private · Sharing" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: /Public/ }).check();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(first.getByRole("button", { name: "Public · Sharing" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Profile sections" })
      .getByRole("link", { name: /^Replays/ })
      .click();
    await expect(page.locator(".replay-library").getByRole("button", { name: "Public · Sharing" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Profile sections" })
      .getByRole("link", { name: "Matches", exact: true })
      .click();
    await first.getByRole("button", { name: "Public · Sharing" }).click();
    await dialog.getByRole("radio", { name: /Private/ }).check();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(first.getByRole("button", { name: "Private · Sharing" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Profile sections" })
      .getByRole("link", { name: /^Replays/ })
      .click();
    await expect(page.locator(".replay-library").getByRole("button", { name: "Private · Sharing" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Profile sections" })
      .getByRole("link", { name: "Matches", exact: true })
      .click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(".profile-page").evaluate((element) => {
      element.scrollTop = 0;
    });
    await testInfo.attach(`profile-${width}`, {
      body: await page.screenshot({ path: testInfo.outputPath("profile.png") }),
      contentType: "image/png",
    });
    await first.getByRole("link", { name: "Watch", exact: true }).click();
    await expect(page.locator(".replay-player")).toBeVisible();
    await expect(page.locator(".aegis-topnav")).toHaveCount(0);
  });
test("private or removed links show a recoverable state without exposing the board", async ({ page }) => {
  await page.route("**/auth/me", (route) => route.fulfill({ json: null }));
  await page.route(`**/replays/${id}/file`, (route) => route.fulfill({ status: 404 }));
  await page.goto(`/replays/${id}`);
  await expect(page.getByRole("alert")).toContainText("Replay unavailable");
  await expect(page.locator(".replay-player")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to replays" }).click();
  await expect(page).toHaveURL(/\/replays$/);
});
test("a public link opens without signing in and MP4 opens the export dialog", async ({ page }) => {
  await setup(page);
  await page.route("**/auth/me", (route) => route.fulfill({ json: null }));
  await page.goto(`/replays/${id}?export=mp4`);
  await expect(page.locator(".replay-player")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Download MP4");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});

test("Portuguese mobile profile routes editing without a dialog", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("aegis:locale", "pt-BR"));
  await setup(page);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Histórico de partidas" })).toBeVisible();
  await expect(page.locator(".profile-matches > li")).toHaveCount(10);
  await page.getByRole("link", { name: "Editar perfil" }).click();
  await expect(page).toHaveURL(/\/profile\/customize$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Histórico de partidas" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("profile-pt-mobile.png") });
});
test("profile load failures can be retried and an empty history explains how to save", async ({ page }) => {
  await setup(page);
  let failed = true;
  await page.route("**/account/profile", (route) =>
    failed ? route.fulfill({ status: 503 }) : route.fulfill({ json: { account, stats: {}, matches: [], decks: [] } }),
  );
  await page.goto("/profile");
  await expect(page.getByRole("alert")).toContainText("Could not load match history");
  failed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your completed matches will appear here." })).toBeVisible();
  await expect(page.getByText("Save a replay on the match result screen to watch it here.")).toBeVisible();
});
test("signed-out profile offers sign-in without leaking account history", async ({ page }) => {
  await page.route("**/auth/me", (route) => route.fulfill({ json: null }));
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Sign in with Discord" })).toBeVisible();
  await expect(page.locator(".profile-matches")).toHaveCount(0);
});

for (const width of [390, 1440])
  test(`profile scroll reaches the last replay above navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    await page.goto("/profile/replays");
    const library = page.getByRole("region", { name: "Saved replays", exact: true });
    await expect(library.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
    await page.getByRole("main").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const bottom = await library.boundingBox();
    const navigation = await page.locator(".aegis-bottom-nav").boundingBox();
    expect(bottom!.y + bottom!.height).toBeLessThanOrEqual(navigation?.y ?? 844);
  });

for (const width of [320, 390, 1440])
  test(`customize stages, cancels, saves, and guards navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    let current = { ...account };
    let saves = 0;
    await page.route("**/account/profile", (route) => {
      if (route.request().method() === "PUT") {
        saves++;
        current = { ...current, ...route.request().postDataJSON() };
        return route.fulfill({ json: current });
      }
      return route.fulfill({ json: { account: current, stats: {}, decks: [], matches: [] } });
    });
    await page.goto("/profile/customize");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const name = page.getByRole("textbox", { name: /Name|name/ });
    await name.fill("New Tamer");
    await page.getByRole("searchbox").fill("Greymon");
    await page.getByRole("button", { name: "Use Greymon as your avatar", exact: true }).click();
    expect(saves).toBe(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(name).toHaveValue("Vinicius");
    await name.fill("New Tamer");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("navigation", { name: "Profile sections" })
      .getByRole("link", { name: "Matches", exact: true })
      .click();
    await expect(page).toHaveURL(/\/profile\/customize$/);
    await expect(name).toHaveValue("New Tamer");
    await page.getByRole("button", { name: "Use Greymon as your avatar", exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Profile updated.");
    expect(saves).toBe(1);
    expect(current).toMatchObject({ displayName: "New Tamer", avatarId: "greymon" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page
      .getByRole("navigation", { name: "Profile sections" })
      .getByRole("link", { name: "Matches", exact: true })
      .click();
    await page.goBack();
    await expect(name).toHaveValue("New Tamer");
    await page.screenshot({ path: `test-results/profile-customize-${width}.png` });
  });

test("avatar opens a compact keyboard-accessible menu without a modal", async ({ page }) => {
  await setup(page);
  await page.goto("/profile");
  const trigger = page.getByRole("button", { name: "Open the player menu" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#player-menu").getByRole("link", { name: "My profile" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#player-menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator("#player-menu").getByRole("link", { name: "Replays" }).click();
  await expect(page).toHaveURL(/\/profile\/replays$/);
});
