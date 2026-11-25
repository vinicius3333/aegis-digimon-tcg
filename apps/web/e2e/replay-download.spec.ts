import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import type { MatchReplay } from "@aegis/shared";
import { expect, test } from "./fixtures";
import { decodeReplayFrames } from "@aegis/shared/replays/decodeReplayFrames";

test("downloads a finished live match and opens it locally after leaving the room", async ({ page, match }) => {
  await match.start("reconnect");
  match.opponent.room.onMessage("replay", () => {});
  match.opponent.room.send("surrender", {});
  await expect(page.getByRole("heading", { name: "Saved on this device" })).toBeVisible();
  const downloadButton = page.getByRole("button", { name: "Download file", exact: true });
  await expect(downloadButton).toBeVisible();
  const pendingDownload = page.waitForEvent("download");
  await downloadButton.click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toMatch(/^aegis-.+-player-1\.aegis-replay$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  const file = JSON.parse(gunzipSync(await readFile(path!)).toString()) as MatchReplay;
  const replay = { ...file, frames: decodeReplayFrames(file.frames) };
  expect(replay.viewerSeat).toBe(0);
  expect(replay.frames[0]!.state.players[0]!.hand.length).toBeGreaterThan(0);
  expect(replay.visibleHandSeats).toEqual([0, 1]);
  expect(replay.frames[0]!.state.players[1]!.hand.length).toBeGreaterThan(0);
  expect(replay.frames.at(-1)!.state.gameOver).toBe(true);
  await page.route("**/auth/me", (route) => route.fulfill({ contentType: "application/json", body: "null" }));
  await page.goto("/profile");
  await page.getByLabel("Open replay file").setInputFiles(path!);
  await expect(page.getByRole("heading", { name: "Browser Protagonist vs Observer Opponent" })).toBeVisible();
  await page.getByRole("button", { name: "Go to end", exact: true }).click();
  await expect(page.getByText("Replay finished", { exact: true })).toBeVisible();
});

test("keeps every finished match in the browser and plays it without Google Drive", async ({ page, match }) => {
  await match.start("reconnect");
  match.opponent.room.onMessage("replay", () => {});
  match.opponent.room.send("surrender", {});
  await expect(page.getByRole("heading", { name: "Saved on this device" })).toBeVisible();
  await expect(
    page.getByText("Not synced with Google Drive. If you switch browsers or clear this site's data, you'll lose it."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  const watch = page.getByRole("link", { name: "Watch now" });
  const href = await watch.getAttribute("href");
  expect(href).toMatch(/^\/replays\/.+/);

  await page.route("**/auth/me", (route) => route.fulfill({ contentType: "application/json", body: "null" }));
  await page.goto(href!);
  await expect(page.getByRole("heading", { name: "Browser Protagonist vs Observer Opponent" })).toBeVisible();
  await page.getByRole("button", { name: "Go to end", exact: true }).click();
  await expect(page.getByText("Replay finished", { exact: true })).toBeVisible();
});
