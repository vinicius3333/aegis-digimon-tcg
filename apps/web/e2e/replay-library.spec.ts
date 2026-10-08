import { gzipSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import { replayFixture } from "../test/replays/fixture";

test("opens a private account replay fullscreen, returns to the library, and confirms deletion", async ({ page }) => {
  const recording = replayFixture();
  const archive = gzipSync(JSON.stringify(recording));
  let files = Array.from({ length: 10 }, (_, index) => ({
    id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
    summary: {
      id: recording.id,
      players: recording.players,
      mode: recording.mode,
      startedAt: recording.startedAt,
      finishedAt: recording.finishedAt,
      winnerSeat: recording.winnerSeat,
      frameCount: recording.frameCount,
    },
    viewerSeat: 0,
    bytes: archive.length,
    savedAt: Date.now() - index,
    status: "ready",
  }));
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "account-id",
        displayName: "Replay Player",
        avatarUrl: null,
        avatarId: null,
        isAdmin: false,
      }),
    }),
  );
  await page.route("**/account/replays**", (route) => {
    const request = route.request();
    if (request.url().endsWith("/file")) return route.fulfill({ contentType: "application/gzip", body: archive });
    if (request.method() === "DELETE") {
      const id = request.url().split("/").at(-1);
      files = files.filter((file) => file.id !== id);
      return route.fulfill({ contentType: "application/json", body: '{"ok":true}' });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ enabled: true, limit: 10, replays: files }),
    });
  });
  await page.goto("/replays");
  await expect(page.locator(".replay-library__count")).toHaveText("10 / 10");
  await page.locator(".replay-library li").first().getByRole("button", { name: "Open replay", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Agumon Player vs Gabumon Player" })).toBeVisible();
  const bounds = await page.locator(".replay-player__board").boundingBox();
  expect(bounds!.y).toBe(0);
  expect(bounds!.height).toBe(page.viewportSize()!.height);
  await expect(page.locator(".aegis-topnav")).toHaveCount(0);
  await page.getByRole("button", { name: "Show action history" }).click();
  await expect(page.getByRole("complementary", { name: "Action history" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("complementary", { name: "Action history" })).toHaveCount(0);
  await page.getByRole("button", { name: "Hide controls" }).click();
  await expect(page.getByRole("slider", { name: "Replay position" })).toBeHidden();
  await page.getByRole("button", { name: "Show controls" }).click();
  await expect(page.getByRole("slider", { name: "Replay position" })).toBeVisible();
  await page.getByRole("button", { name: "Back to replays" }).click();
  await expect(page.locator(".replay-library__count")).toHaveText("10 / 10");
  await page.locator(".replay-library li").first().getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Delete this saved replay?", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".replay-library__count")).toHaveText("10 / 10");
  await page.locator(".replay-library li").first().getByRole("button", { name: "Delete", exact: true }).click();
  await page.locator(".replay-library li").first().getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".replay-library__count")).toHaveText("9 / 10");
});

test("shows and inspects both recorded hands on mobile with controls clear of the player's cards", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const replay = replayFixture();
  replay.visibleHandSeats = [0, 1];
  for (const frame of replay.frames) {
    frame.state.players[1]!.hand = frame.state.players[0]!.hand.map((card) => ({
      ...card,
      cardId: "BT1-029",
      ownerSeat: 1,
      instanceId: `opponent-${card.instanceId}`,
    })) as never;
    frame.state.players[1]!.handCount = frame.state.players[1]!.hand.length;
  }
  await page.route("**/auth/me", (route) => route.fulfill({ contentType: "application/json", body: "null" }));
  await page.route("**/account/replays", (route) => route.fulfill({ status: 401 }));
  await page.goto("/replays");
  await page.getByLabel("Open replay file").setInputFiles({
    name: "both-hands.aegis-replay",
    mimeType: "application/gzip",
    buffer: gzipSync(JSON.stringify(replay)),
  });
  const opponent = page.getByTestId("opponent-hand").getByRole("button").first();
  await expect(opponent).toBeVisible();
  await opponent.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const hand = await page.getByTestId("hand").boundingBox();
  const controls = await page.locator(".replay-controls").boundingBox();
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(hand!.y);
  await page.getByTestId("hand").getByRole("button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
