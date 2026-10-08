import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { replayFixture } from "../test/replays/fixture";

test.use({
  channel: "chromium",
  launchOptions: {
    args: [
      "--auto-accept-this-tab-capture",
      "--enable-usermedia-screen-capturing",
      "--auto-select-tab-capture-source-by-title=Aegis replay presentation tests",
    ],
  },
});

test("records the real replay tab and downloads a playable MP4 only after playback finishes", async ({
  page,
}, testInfo) => {
  await page.goto("/e2e/replay-harness.html");
  const archive = await readFile(
    new URL("../test/replays/recordings/arena-bt24-silphymon-dna.aegis-replay", import.meta.url),
  );
  await page
    .getByLabel("Open replay file")
    .setInputFiles({ name: "recording.aegis-replay", mimeType: "application/gzip", buffer: archive });
  await page.getByRole("button", { name: "Download MP4", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record and download" })).toBeEnabled();
  const downloaded = page.waitForEvent("download", { timeout: 60000 });
  void downloaded.catch(() => undefined);
  await page.getByRole("button", { name: "Record and download" }).click();
  await expect(page.getByText("Recording MP4…", { exact: true })).toBeVisible();
  const file = await downloaded;
  expect(file.suggestedFilename()).toMatch(/\.mp4$/);
  const destination = testInfo.outputPath("replay.mp4");
  await file.saveAs(destination);
  const bytes = await readFile(destination);
  expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
  expect(bytes.length).toBeGreaterThan(10000);
  await expect(page.getByRole("status").filter({ hasText: "MP4 ready to download" })).toBeVisible();
  const metadata = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>('a[download$=".mp4"]')!;
    const video = document.createElement("video");
    video.src = link.href;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Invalid MP4"));
    });
    return { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
  });
  expect(metadata.width).toBeGreaterThan(300);
  expect(metadata.height).toBeGreaterThan(300);
  await testInfo.attach("mp4-metadata", { body: JSON.stringify(metadata), contentType: "application/json" });
  await testInfo.attach("replay.mp4", { path: destination, contentType: "video/mp4" });
});

test("cancelling a recording releases capture without downloading an incomplete file", async ({ page }) => {
  await page.goto("/e2e/replay-harness.html");
  await page.getByLabel("Open replay file").setInputFiles({
    name: "recording.aegis-replay",
    mimeType: "application/gzip",
    buffer: gzipSync(JSON.stringify(replayFixture())),
  });
  const downloads: string[] = [];
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  await page.getByRole("button", { name: "Download MP4", exact: true }).click();
  await page.getByRole("button", { name: "Record and download" }).click();
  await page.getByRole("button", { name: "Cancel recording" }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.locator(".replay-player--exporting")).toHaveCount(0);
  expect(downloads).toEqual([]);
});

test("unsupported MP4 exposes instructions without a misleading export action", async ({ page }) => {
  await page.addInitScript(() => {
    MediaRecorder.isTypeSupported = () => false;
  });
  await page.goto("/e2e/replay-harness.html");
  await page.getByLabel("Open replay file").setInputFiles({
    name: "recording.aegis-replay",
    mimeType: "application/gzip",
    buffer: gzipSync(JSON.stringify(replayFixture())),
  });
  await page.getByRole("button", { name: "Download MP4", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("MP4 recording is unavailable");
  await expect(page.getByRole("button", { name: "Record and download" })).toBeDisabled();
});
