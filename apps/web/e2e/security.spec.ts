import { test, expect } from "./fixtures";

test("security reveal stays on screen through the chained decisions and resolves", async ({ page, match }) => {
  await match.start("security");
  const clash = page.getByTestId("security-clash");
  await expect.poll(() => match.server.pendingBotDecision()?.kind).toBe("optional");
  await expect(clash).toHaveAttribute("data-resolution", "pending");
  await expect(clash.getByRole("img", { name: /susanoomon/i })).toBeVisible();
  // Visibility alone permits opacity zero during the legitimate entrance animation.
  // Begin the hold assertion only once that entrance has actually painted.
  await expect(clash).toHaveCSS("opacity", "1");
  const first = await match.snapshot();
  // The revealed card has already left security while its battle is pending.
  expect(first.players[0]!.securityCount).toBe(4);
  const firstDecision = match.server.pendingBotDecision()!.decisionId;
  // Observe all painted frames between the two decisions, including gaps too brief
  // for a single locator assertion. The probe never changes DOM or engine state.
  await page.evaluate(() => {
    const evidence = { missing: false, prematureVerdict: false, frames: 0, stopped: false };
    Object.assign(window, { securityEvidence: evidence });
    function sample() {
      if (evidence.stopped) return;
      const scene = document.querySelector<HTMLElement>('[data-testid="security-clash"]');
      if (
        !scene ||
        scene.getBoundingClientRect().width === 0 ||
        getComputedStyle(scene).visibility === "hidden" ||
        Number(getComputedStyle(scene).opacity) === 0
      )
        evidence.missing = true;
      if (scene?.dataset.resolution !== "pending") evidence.prematureVerdict = true;
      evidence.frames++;
      requestAnimationFrame(sample);
    }
    sample();
  });
  match.server.releaseBotDecision();
  await expect.poll(() => match.server.pendingBotDecision()?.decisionId).toBeTruthy();
  expect(match.server.pendingBotDecision()!.decisionId).not.toBe(firstDecision);
  expect(match.server.pendingBotDecision()!.kind).toBe("selectCards");
  await expect(clash).toHaveAttribute("data-resolution", "pending");
  await expect(clash.getByRole("img", { name: /susanoomon/i })).toBeVisible();
  const evidence = await page.evaluate(() => {
    const probe = (
      window as unknown as {
        securityEvidence: { missing: boolean; prematureVerdict: boolean; frames: number; stopped: boolean };
      }
    ).securityEvidence;
    probe.stopped = true;
    return probe;
  });
  expect(evidence.frames).toBeGreaterThan(1);
  expect(evidence.missing).toBe(false);
  expect(evidence.prematureVerdict).toBe(false);
  match.server.releaseBotDecision();
  await expect(clash).toHaveAttribute("data-resolution", "battle");
  await expect(clash).toHaveCount(0);
  await expect
    .poll(async () => (await match.snapshot()).players[0]!.trash.some((card) => card.cardId === "EX12-076"))
    .toBe(true);
  await expect.poll(async () => (await match.snapshot()).players[0]!.securityCount).toBe(4);
});
