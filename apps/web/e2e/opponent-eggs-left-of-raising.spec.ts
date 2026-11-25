import fixture from "@api-fixtures/field-card-size-by-viewport.fixture";
import { test, expect } from "@e2e/scenario-page";
import { stubCardArtwork } from "@e2e/card-artwork";

for (const viewport of [
  { name: "phone portrait", width: 411, height: 891 },
  { name: "phone landscape", width: 891, height: 411 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`puts each player's egg deck left of their raising slot in ${viewport.name}`, async ({ scenario, page }) => {
    await stubCardArtwork(page);
    await page.addInitScript(() => localStorage.setItem("aegis.board-style", "classic"));
    await page.setViewportSize(viewport);
    await scenario.openFixture(fixture, "normal", "none");
    await expect(page.locator(".game-egg-deck--hatchable")).toBeVisible();
    const leftOf = (selector: string) =>
      page.locator(selector).evaluate((element) => element.getBoundingClientRect().left);
    expect(await leftOf(".game-utility-slot--opp-eggs")).toBeLessThan(await leftOf(".game-utility-slot--opp-raising"));
    expect(await leftOf(".game-utility-slot--you-eggs")).toBeLessThan(await leftOf(".game-utility-slot--you-raising"));
    await scenario.healthy();
  });
}
