const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/products";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { startSealedBrowserServer } from "../../api/test-support/startSealedBrowserServer";

let backend: Awaited<ReturnType<typeof startSealedBrowserServer>>;
test.beforeAll(async () => {
  backend = await startSealedBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
});
test.afterAll(async () => {
  await backend?.close();
});

for (const setId of ["EX13", "BT26"]) {
  test(`organizer selects ${setId} in the real tournament creation page`, async ({ page, context }) => {
    const owner = await backend.accounts.accountForIdentity("discord", randomUUID(), "Product organizer");
    const session = await backend.accounts.issueSession(owner);
    await context.addCookies([{ name: "aegis_session", value: session.id, domain: "127.0.0.1", path: "/" }]);
    await page.goto("/tournaments/new");
    await page.getByRole("checkbox", { name: "Sealed Swiss · six packs", exact: true }).check();
    await page.getByRole("combobox", { name: "Booster series", exact: true }).selectOption(setId);
    await expect(page.locator(".sealed-product__art")).toHaveAttribute("src", `/sets/${setId}.jpg`);
    await page.getByRole("textbox", { name: "Name", exact: true }).fill(`Selected ${setId} series`);
    await page.screenshot({
      path: `${evidence}/swiss-create-${setId}.png`,
      fullPage: true,
    });
    const response = page.waitForResponse(
      (result) => result.url().endsWith("/tournaments") && result.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create tournament", exact: true }).click();
    const created = await response;
    expect(created.status()).toBe(201);
    const event = await created.json();
    expect(event.sealedConfiguration.setId).toBe(setId);
    expect((await backend.accounts.tournament(event.id))!.sealedConfiguration?.setId).toBe(setId);
    await expect(page.getByRole("combobox", { name: "Booster series" })).toHaveCount(0);
  });
}
