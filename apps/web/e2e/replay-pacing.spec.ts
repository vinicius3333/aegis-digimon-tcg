import { readFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { test, expect, type Page } from "@playwright/test";
import type { VisibleBoard, VisiblePermanent } from "../src/game/screen/model/visibleBoard";
import type { MatchReplay } from "@aegis/shared";
import { REPLAY_RECORDINGS } from "../test/replays/recordings";
import { drawReplayFixture, securityReplayFixture } from "../test/replays/fixture";

test.describe.configure({ mode: "parallel" });

class ReplayPacingPage {
  constructor(readonly page: Page) {}
  async open(recording = securityReplayFixture(), speed = "1", instrumented = false) {
    await this.page.route("**/auth/me", (route) => route.fulfill({ contentType: "application/json", body: "null" }));
    await this.page.route("**/account/replays", (route) => route.fulfill({ status: 401, body: "Unauthorized" }));
    await this.page.goto(instrumented ? "/e2e/replay-harness.html" : "/replays");
    await this.page.getByLabel("Open replay file").setInputFiles({
      name: "pacing.aegis-replay",
      mimeType: "application/gzip",
      buffer: gzipSync(JSON.stringify(recording)),
    });
    await this.page.getByLabel("Playback options", { exact: true }).click();
    await this.page.getByLabel("Playback speed").selectOption(speed);
  }
  play() {
    return this.page.getByRole("button", { name: "Play", exact: true }).click();
  }
}

test("speed scales painted animations as well as the replay cursor", async ({ page }) => {
  const replay = new ReplayPacingPage(page);
  await replay.open(drawReplayFixture(), "0.5");
  await replay.play();
  await page.waitForFunction(() =>
    document
      .querySelector(".replay-player__board")
      ?.getAnimations({ subtree: true })
      .some(
        (a) => a.playState === "running" && "animationName" in a && /draw|arrival|flight/.test(String(a.animationName)),
      ),
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const animations = document
          .querySelector(".replay-player__board")!
          .getAnimations({ subtree: true })
          .filter(
            (a) =>
              a.playState === "running" && "animationName" in a && /draw|arrival|flight/.test(String(a.animationName)),
          );
        return animations.length > 0 && animations.every((a) => a.playbackRate === 0.5);
      }),
    )
    .toBe(true);
});

test("pause freezes the currently painted card arrival", async ({ page }) => {
  const replay = new ReplayPacingPage(page);
  await replay.open(drawReplayFixture(), "0.5");
  await replay.play();
  // Detect and click in the same browser task: a protocol round trip can outlive a short flight under load.
  await page.waitForFunction(() => {
    const moving = document
      .querySelector(".replay-player__board")
      ?.getAnimations({ subtree: true })
      .some(
        (animation) =>
          animation.playState === "running" &&
          "animationName" in animation &&
          /draw|arrival|flight/.test(String(animation.animationName)),
      );
    if (!moving) return false;
    document.querySelector<HTMLButtonElement>('.replay-controls__play[aria-pressed="true"]')?.click();
    return true;
  });
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  const motion = await page.evaluate(async () => {
    const animations = document
      .querySelector(".replay-player__board")!
      .getAnimations({ subtree: true })
      .filter((a) => "animationName" in a && /draw|arrival|flight/.test(String(a.animationName)));
    const before = animations.map((a) => Number(a.currentTime));
    await new Promise((resolve) => setTimeout(resolve, 450));
    return animations.map((a, i) => ({ delta: Number(a.currentTime) - before[i]!, state: a.playState }));
  });
  expect(motion.length).toBeGreaterThan(0);
  expect(motion.every((a) => a.state === "paused" && Math.abs(a.delta) < 34)).toBe(true);
});

test("the final frame stays playable until its card arrival settles", async ({ page }) => {
  const recording = drawReplayFixture();
  recording.frames.splice(2, 2);
  recording.frameCount = recording.frames.length;
  recording.frames[1]!.state.gameOver = true;
  recording.frames[1]!.state.winnerSeat = 0;
  const replay = new ReplayPacingPage(page);
  await replay.open(recording);
  await replay.play();
  // Inspect transport state in the same browser task as the short arrival animation.
  // A protocol round trip under load can outlive the beat being asserted.
  const arrival = await page.waitForFunction(() => {
    const moving = document
      .querySelector(".replay-player__board")
      ?.getAnimations({ subtree: true })
      .some(
        (a) => a.playState === "running" && "animationName" in a && /draw|arrival|flight/.test(String(a.animationName)),
      );
    return moving
      ? {
          playing: document.querySelector(".replay-controls__play")?.getAttribute("aria-pressed") === "true",
          finished:
            document.querySelector(".replay-controls__timeline [role=status]")?.textContent === "Replay finished",
        }
      : null;
  });
  expect(await arrival.jsonValue()).toEqual({ playing: true, finished: false });
  await expect(page.getByText("Replay finished", { exact: true })).toBeVisible();
});

function recordingFor(id: string): MatchReplay {
  return JSON.parse(gunzipSync(readFileSync(`test/replays/recordings/${id}.aegis-replay`)).toString());
}
function physicalBoard(board: VisibleBoard) {
  const permanent = (entry: VisiblePermanent) => ({
    id: entry.permanentId,
    card: entry.topCard.cardId,
    stack: entry.stack.map((card) => card.instanceId),
    dp: entry.currentDP,
    suspended: entry.isSuspended,
  });
  return {
    memory: board.memory.value,
    players: board.players.map((player) => ({
      field: player.battleArea.map(permanent),
      breeding: player.breeding ? permanent(player.breeding) : null,
      hand: player.hand.map((card) => card.instanceId),
      handCount: player.handCount,
      deckCount: player.deckCount,
      security: player.securityCount,
      trash: player.trash.map((card) => card.instanceId),
    })),
  };
}
type Evidence = {
  idle: boolean;
  failed: string[];
  expiries: string[];
  board: VisibleBoard;
  counters: { boardBudgetHits: number };
  steps: { id: string; phase: string; at: number; track?: string }[];
};
async function evidenceFor(page: Page): Promise<Evidence> {
  return page.evaluate(() => (window as unknown as { replayEvidence: () => Evidence }).replayEvidence());
}
const cases = [
  ...REPLAY_RECORDINGS.map((id) => ({ id, speed: "4", mobile: false })),
  { id: "effects-lab-own-chain", speed: "1", mobile: false },
  { id: "keyword-pacing-recovery-many", speed: "0.5", mobile: false },
  { id: "arena-bt24-silphymon-dna", speed: "4", mobile: true },
  { id: "phase-pacing-bot-raising-move", speed: "4", mobile: true },
];
for (const { id, speed, mobile } of cases) {
  test(`complex recording settles with correct board: ${id} ${speed}x ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }, info) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource"))
        errors.push(message.text());
    });
    const replay = new ReplayPacingPage(page);
    const recording = recordingFor(id);
    await replay.open(recording, speed, true);
    await replay.play();
    try {
      await expect(page.getByText("Replay finished", { exact: true })).toBeVisible({ timeout: 60000 });
      expect(errors).toEqual([]);
      const evidence = await evidenceFor(page);
      expect(evidence.idle).toBe(true);
      expect(evidence.failed).toEqual([]);
      expect(evidence.expiries).toEqual([]);
      expect(evidence.counters.boardBudgetHits).toBe(0);
      const last = recording.frames.at(-1)!.state;
      // Compare the rendered projection, including transient holds being fully released.
      await expect
        .poll(async () => physicalBoard((await evidenceFor(page)).board))
        .toEqual(
          physicalBoard({
            memory: { value: last.memory, turnSeat: last.turnSeat },
            turn: { seat: last.turnSeat, count: last.turnCount },
            players: last.players as unknown as VisibleBoard["players"],
          }),
        );
      await info.attach("presentation-evidence", {
        body: JSON.stringify(evidence, null, 2),
        contentType: "application/json",
      });
    } finally {
      await info.attach("cue-trace", {
        body: JSON.stringify({ errors, evidence: await evidenceFor(page) }, null, 2),
        contentType: "application/json",
      });
    }
  });
}
for (const index of [36, 51]) {
  test(`seek into a De-Digivolve chain and resume from action ${index + 1}`, async ({ page }) => {
    const replay = new ReplayPacingPage(page);
    await replay.open(recordingFor("effects-lab-prod-attack-stack"), "4", true);
    await page.getByRole("button", { name: "Show action history" }).click();
    // The ordered history maps one button to each exact recorded batch.
    await page
      .getByRole("complementary", { name: "Action history" })
      .getByRole("list")
      .getByRole("button")
      .nth(index)
      .click();
    await page.keyboard.press("Escape");
    await replay.play();
    await expect(page.getByText("Replay finished", { exact: true })).toBeVisible({ timeout: 60000 });
    const evidence = await evidenceFor(page);
    expect(evidence.idle).toBe(true);
    expect(evidence.failed).toEqual([]);
    expect(evidence.expiries).toEqual([]);
  });
}
test("a long pause in a complex chain preserves its waits and resumes cleanly", async ({ page }) => {
  const replay = new ReplayPacingPage(page);
  await replay.open(recordingFor("effects-lab-prod-ghost-execute-security"), "4", true);
  await replay.play();
  await expect
    .poll(
      async () =>
        (await evidenceFor(page)).steps.filter(
          (step) => step.phase === "started" && /effect|narrat|notice|source/.test(step.id),
        ).length,
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const position = await page.getByRole("slider", { name: "Replay position" }).inputValue();
  // Elapsed pause is the behavior under test, including the real gate ceilings.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 6500)));
  await expect(page.getByRole("slider", { name: "Replay position" })).toHaveValue(position);
  expect((await evidenceFor(page)).expiries).toEqual([]);
  await replay.play();
  await expect(page.getByText("Replay finished", { exact: true })).toBeVisible({ timeout: 60000 });
  expect((await evidenceFor(page)).failed).toEqual([]);
  expect((await evidenceFor(page)).expiries).toEqual([]);
});

test("Execute focuses the field before deletion and On Deletion focuses the trash", async ({ page }) => {
  const replay = new ReplayPacingPage(page);
  await replay.open(recordingFor("effects-lab-prod-ghost-execute-security"), "4", true);
  await page.evaluate(() => {
    const seen = new Map<string, string>();
    Object.assign(window, { executeSites: () => [...seen.values()] });
    const observe = () => {
      for (const element of document.querySelectorAll(
        '[data-testid="effect-focus"][data-source-card-id="EX11-051"] .game-effect-focus__pulse, .game-pile__effect-card[data-card-id="EX11-051"]',
      )) {
        const key = element.getAttribute("data-activation-key")!;
        if (!seen.has(key)) seen.set(key, element.closest('[data-testid="effect-focus"]') ? "field" : "trash");
      }
    };
    new MutationObserver(observe).observe(document.body, { childList: true, subtree: true, attributes: true });
  });
  await replay.play();
  await expect(page.getByText("Replay finished", { exact: true })).toBeVisible({ timeout: 60000 });
  const sites = await page.evaluate(() => (window as unknown as { executeSites: () => string[] }).executeSites());
  expect(sites.slice(0, 2)).toEqual(["field", "field"]);
  expect(sites.slice(2)).toContain("trash");
});
