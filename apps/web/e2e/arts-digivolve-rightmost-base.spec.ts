import fixture from "@api-fixtures/arts-digivolve-rightmost-base.fixture";
import type { Locator } from "@playwright/test";
import { test, expect } from "@e2e/scenario-page";

test.use({ holdBotAfterTurn: 1 });

async function isCovering(cover: Locator, target: Locator) {
  if (!(await cover.isVisible())) {
    return false;
  }
  const [coverBox, targetBox] = await Promise.all([cover.boundingBox(), target.boundingBox()]);
  if (!coverBox || !targetBox) {
    return false;
  }
  return (
    coverBox.x < targetBox.x + targetBox.width &&
    targetBox.x < coverBox.x + coverBox.width &&
    coverBox.y < targetBox.y + targetBox.height &&
    targetBox.y < coverBox.y + coverBox.height
  );
}

for (const viewport of [
  { width: 740, height: 340 },
  { width: 412, height: 780 },
  { width: 1440, height: 1000 },
]) {
  test(`Arts Digivolve keeps the rightmost base selectable at ${viewport.width}x${viewport.height}`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize(viewport);
    const refs = await scenario.openFixture(fixture, "normal", "none");
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    await scenario.play("Nosferamon", "Option");
    await page.getByRole("button", { name: "Use as Option", exact: true }).click();
    await scenario.resolveUntil((state) => state.pendingDecision?.kind === "selectCards");
    const prompt = page.getByTestId("board-prompt");
    await expect(prompt).toContainText("Arts Digivolve");
    const selectOnBoard = prompt.getByRole("button", { name: "Select on board", exact: true });
    await expect(selectOnBoard).toBeInViewport({ ratio: 1 });
    await selectOnBoard.click();
    const base = page.locator(`[data-drop="perm-you"][data-id="${refs.permanentId("arts-base")}"]`);
    expect(await isCovering(page.getByTestId("security-branch"), base)).toBe(false);
    await base.click({ timeout: 5_000 });
    await page.getByRole("button", { name: "Confirm targets", exact: true }).click();
    await scenario.resolveUntil(
      (state) =>
        state.players[0]!.battleArea.find((permanent) => permanent.permanentId === refs.permanentId("arts-base"))
          ?.topCard.cardId === "BT27-082",
    );
    await scenario.healthy();
  });
}
