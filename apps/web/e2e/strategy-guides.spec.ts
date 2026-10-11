import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { PracticePage } from "./practice-page";

interface Guide {
  slug: string;
  title: string;
  url: string;
  strictVerified: boolean;
}

const catalog: Guide[] = JSON.parse(readFileSync(new URL("../src/guides/catalog.json", import.meta.url), "utf8"));

class GuidePage {
  constructor(readonly page: Page) {}

  async open(guide: Guide) {
    const response = await this.page.goto(guide.url);
    expect([200, 304]).toContain(response?.status());
    if (response?.status() === 200) expect(response.headers()["content-type"]).toContain("text/html");
    await expect(this.page.getByRole("heading", { name: guide.title, exact: true, level: 1 })).toBeVisible();
  }

  async checkKeyboardAndLayout() {
    await this.page.keyboard.press("Tab");
    await expect(this.page.getByRole("link", { name: "Skip to guide", exact: true })).toBeFocused();
    await this.page.keyboard.press("Enter");
    await expect(this.page).toHaveURL(/#content$/);
    await expect
      .poll(() => this.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
  }

  async openPractice(slug: string) {
    await this.page.getByRole("link", { name: "Play on Aegis", exact: true }).click();
    await expect(this.page).toHaveURL(new RegExp(`/play\\?utm_source=strategy-guides&utm_content=${slug}$`));
    // Exercise the production app route as a new guest, without requiring an account.
    await expect(this.page.getByRole("button", { name: /Practice vs AI/i })).toBeVisible();
  }
}

test.beforeAll(() => {
  expect(catalog.some((guide) => guide.slug === "fundamentals")).toBe(true);
});

for (const width of [390, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`published guides start guest practice at ${width}px in ${colorScheme} mode`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.emulateMedia({ colorScheme });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      const robotsResponse = await request.get("/robots.txt");
      expect(robotsResponse.status()).toBe(200);
      expect(robotsResponse.headers()["content-type"]).toContain("text/plain");
      const strict = catalog.every((guide) => guide.strictVerified);
      if (!strict) expect(await robotsResponse.text()).not.toMatch(/^Sitemap:/m);
      const sitemapResponse = await request.get("/strategy-guides/sitemap.xml");
      expect(sitemapResponse.status()).toBe(200);
      const sitemap = await sitemapResponse.text();
      if (!strict) expect(sitemap).not.toContain("<loc>");

      const evidenceResponse = await request.get("/strategy-guides/evidence.json");
      expect(evidenceResponse.status()).toBe(200);
      const evidence = await evidenceResponse.json();
      expect(evidence.simulations).toBeGreaterThanOrEqual(strict ? 128 : 8);
      expect(Object.keys(evidence.policies)).toHaveLength(catalog.length);
      if (!strict) expect(evidence.experimental).toBe(true);

      await page.goto("/");
      const homeLink = page.getByRole("link", { name: "Learn a deck with our strategy guides", exact: true });
      if (strict) await homeLink.click();
      else {
        await expect(homeLink).toHaveCount(0);
        await page.goto("/strategy-guides/");
      }
      await expect(page).toHaveURL(/\/strategy-guides\/$/);
      await expect(page.getByRole("heading", { name: "Strategy guides", exact: true, level: 1 })).toBeVisible();
      for (const guide of catalog) {
        await expect(page.getByRole("link", { name: new RegExp(guide.title) })).toHaveAttribute("href", guide.url);
      }
      await page.screenshot({ path: testInfo.outputPath("guide-index.png"), fullPage: true });

      const guidePage = new GuidePage(page);
      for (const guide of catalog) {
        await guidePage.open(guide);
        await guidePage.checkKeyboardAndLayout();
        if (!strict) await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
        await expect(page.locator("html")).toHaveCSS("color-scheme", colorScheme);
        await expect(page.getByRole("heading", { name: "Practice results", exact: true })).toBeVisible();
        await page.getByText("How this guide was selected", { exact: true }).click();
        await expect(page.getByRole("link", { name: "Download policy and benchmark evidence" })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${guide.slug}.png`), fullPage: true });
      }
      const fundamentals = catalog.find((guide) => guide.slug === "fundamentals")!;
      await guidePage.open(fundamentals);
      await guidePage.openPractice(fundamentals.slug);
      await new PracticePage(page).startMatch();
      expect(errors).toEqual([]);
    });
  }
}
