import { expect, test, type Page } from "@playwright/test";

class FeedbackInboxPage {
  constructor(readonly page: Page) {}

  async open(isAdmin = true) {
    await this.page.route("http://127.0.0.1:2569/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const body =
        path === "/auth/me"
          ? { id: "admin-fixture", displayName: "Vn", isAdmin, avatarUrl: null, avatarId: null }
          : path === "/account/feedback"
            ? {
                items: [
                  {
                    id: 42,
                    report: {
                      kind: "bug",
                      summary: "On-play effect does not activate",
                      description: "Play Agumon, then select the opponent's Digimon.\nThe effect does not resolve.",
                      reporterName: "Tamer",
                      cardIds: ["BT1-010"],
                      matchId: "f62249e5-ba6e-4528-b517-63bee8fbbb0f",
                      userAgent: "Browser context ".repeat(20),
                    },
                    createdAt: 1780000000000,
                    githubStatus: "sent",
                    githubNumber: 42,
                    githubUrl: "https://github.com/example/repo/issues/42",
                  },
                ],
                nextBefore: null,
              }
            : path === "/account/decks"
              ? []
              : {};
      await route.fulfill({ json: body });
    });
    await this.page.goto("/admin/feedback");
  }
}

for (const width of [320, 768, 1024, 1440]) {
  test(`administrator inbox fits ${width}px and exposes report context`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await new FeedbackInboxPage(page).open();
    await expect(page.getByRole("heading", { name: "On-play effect does not activate" })).toBeVisible();
    const details = page.getByText("Technical details", { exact: true });
    await details.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("f62249e5-ba6e-4528-b517-63bee8fbbb0f", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open GitHub issue #42" })).toBeVisible();
    const region = page.getByRole("region", { name: "Player feedback" });
    expect(await region.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`feedback-${width}.png`), fullPage: true });
    await region.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    const older = await page.getByRole("button", { name: "Older", exact: true }).boundingBox();
    expect(older).not.toBeNull();
    expect(older!.y + older!.height).toBeLessThanOrEqual(900 - (width < 960 ? 68 : 0));
    expect(errors).toEqual([]);
  });
}

test("direct navigation by an ordinary player does not request feedback", async ({ page }) => {
  let reads = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/account/feedback") reads++;
  });
  await new FeedbackInboxPage(page).open(false);
  await expect(page.getByText("Only administrators can view feedback.")).toBeVisible();
  expect(reads).toBe(0);
});
