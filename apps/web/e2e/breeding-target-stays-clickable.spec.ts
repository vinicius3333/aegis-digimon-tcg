import fixture from "@api-fixtures/breeding-target-stays-clickable.fixture";
import { test, expect, answerActivation } from "@e2e/scenario-page";
import { stubCardArtwork } from "@e2e/card-artwork";

const desktopBoards = [
  { width: 1280, height: 720, colorScheme: "light" },
  { width: 1366, height: 768, colorScheme: "dark" },
  { width: 1536, height: 864, colorScheme: "light" },
  { width: 1920, height: 1080, colorScheme: "dark" },
] as const;

for (const board of desktopBoards) {
  test(`a breeding-area prompt leaves the breeding slot uncovered at ${board.width}x${board.height} ${board.colorScheme}`, async ({
    scenario,
    page,
  }) => {
    await stubCardArtwork(page);
    await page.emulateMedia({ colorScheme: board.colorScheme });
    await page.setViewportSize({ width: board.width, height: board.height });
    await scenario.openFixture(fixture, "normal", "none");
    await scenario.idle();
    await scenario.play("Dokuson Aruba", "Tamer");
    await answerActivation(page, true);
    await expect(page.getByText("This Digimon may move.", { exact: false })).toBeVisible({ timeout: 30_000 });
    const accept = page.getByRole("button", { name: "Yes, activate" });
    const decline = page.getByRole("button", { name: "No, decline" });
    await expect(accept).toBeInViewport({ ratio: 1 });
    await expect(decline).toBeInViewport({ ratio: 1 });
    const slot = page.locator('[data-drop="breeding-you"]');
    await expect(slot).toBeVisible();
    const coveredPoints = await slot.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      let covered = 0;
      for (let column = 1; column <= 5; column++) {
        for (let row = 1; row <= 5; row++) {
          const hit = document.elementFromPoint(
            bounds.left + (bounds.width * column) / 6,
            bounds.top + (bounds.height * row) / 6,
          );
          if (!hit || !element.contains(hit)) covered++;
        }
      }
      return covered;
    });
    expect(coveredPoints).toBe(0);
  });
}
