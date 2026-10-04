import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 },
];

for (const scenario of ["crowded", "hand=12", "hand=30"]) {
  test(`mobile board fits ${scenario} without scrolling`, async ({ page }) => {
    await page.goto(`/dev/arena?mode=visual&${scenario === "crowded" ? "scenario=crowded" : scenario}`);
    await page.locator('[data-field-layout="organized"]').first().waitFor();
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const failures: string[] = [];
            const within = (card: Element, container: Element) => {
              const c = card.getBoundingClientRect();
              const r = container.getBoundingClientRect();
              return c.left >= r.left - 1 && c.right <= r.right + 1 && c.top >= r.top - 1 && c.bottom <= r.bottom + 1;
            };
            for (const row of document.querySelectorAll<HTMLElement>('[data-field-layout="organized"]')) {
              if (row.dataset.fitAll !== "true") failures.push("phone fitter inactive");
              for (const lane of row.querySelectorAll<HTMLElement>(".game-battle-lane")) {
                if (lane.scrollWidth > lane.clientWidth + 1) failures.push("field scrolls");
              }
              for (const card of row.querySelectorAll("[data-field-key]")) {
                if (!within(card, row)) failures.push("field card clipped");
              }
            }
            const hand = document.querySelector<HTMLElement>('[data-testid="hand"]')!;
            if (hand.scrollWidth > hand.clientWidth + 1) failures.push("hand scrolls");
            for (const card of hand.querySelectorAll(".game-hand-card > div")) {
              if (!within(card, hand)) failures.push("hand card clipped");
            }
            for (const side of ["you", "opp"]) {
              const raising = document.querySelector(`.game-utility-slot--${side}-raising`)!.getBoundingClientRect();
              const security = document.querySelector(`.game-security-shield--${side}`)!;
              for (const card of security.querySelectorAll(".game-security-cards i")) {
                if (card.getBoundingClientRect().bottom > raising.top + 1) failures.push("security overlaps raising");
              }
            }
            if (document.documentElement.scrollWidth > innerWidth + 1) failures.push("page scrolls");
            return failures;
          }),
        )
        .toEqual([]);
    }
    await page.locator('[data-testid="hand"] .game-hand-card').first().click();
  });
}

test("compact security labels leave the attack target clickable", async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 320 });
  await page.goto("/dev/arena?mode=visual&scenario=security");
  await page.locator('.game-battle-row--you [data-field-key="you-funbeemon"]').click();
  await page.getByRole("button", { name: /^(attack|atacar)$/i }).click();
  const label = page.locator(".game-security-shield__attack-label");
  await expect(label).toBeVisible();
  await expect
    .poll(() =>
      label.evaluate((element) => {
        const l = element.getBoundingClientRect();
        const bar = element.closest(".game-security-shield-wrap")!.getBoundingClientRect();
        return l.left >= bar.left - 1 && l.right <= bar.right + 1 && l.top >= bar.top - 1 && l.bottom <= bar.bottom + 1;
      }),
    )
    .toBe(true);
  await page.locator(".game-security-shield--opp").click();
  await expect(label).toBeHidden();
});
