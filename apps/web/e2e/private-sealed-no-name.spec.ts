import { selectPrivateSealedFormat } from "./selectPrivateSealedFormat";
import { mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { startPrivateSealedBrowserServer } from "../../api/test-support/startPrivateSealedBrowserServer";
import type { PrivateSealedView } from "@aegis/shared/sealed/private/PrivateSealedContracts";

const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/identity";
const api = `http://127.0.0.1:${process.env.AEGIS_E2E_EDGE_PORT ?? 2569}`;
let backend: Awaited<ReturnType<typeof startPrivateSealedBrowserServer>>;

test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
  backend = await startPrivateSealedBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
});
test.afterAll(async () => {
  await backend?.close();
});

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`uses existing automatic guest names without typing at ${width}px ${dark ? "dark" : "light"}`, async ({
      browser,
    }) => {
      const hostContext = await browser.newContext({ viewport: { width, height: 844 } });
      const guestContext = await browser.newContext({ viewport: { width, height: 844 } });
      const host = await hostContext.newPage();
      const guest = await guestContext.newPage();
      const errors: string[] = [];
      try {
        for (const page of [host, guest]) {
          page.on("pageerror", (error) => errors.push(error.message));
          await page.addInitScript((value) => localStorage.setItem("aegis:darkMode", String(value)), dark);
        }
        await host.goto("/play", { waitUntil: "domcontentloaded" });
        await selectPrivateSealedFormat({ page: host });
        const hostName = await host.evaluate(() => JSON.parse(localStorage.getItem("aegis:player")!).name as string);
        expect(hostName).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+$/);
        await expect(host.getByRole("textbox", { name: /player name/i })).toHaveCount(0);
        await expect(host.getByLabel(/player name/i)).toHaveCount(0);
        await expect(host.getByRole("button", { name: "Create", exact: true })).toBeEnabled();
        await host.getByRole("combobox", { name: "Booster series", exact: true }).selectOption("BT26");
        await host.screenshot({ path: `${evidence}/create-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
        const createdRequest = host.waitForRequest(
          (request) => request.url() === `${api}/private-sealed` && request.method() === "POST",
        );
        await host.getByRole("button", { name: "Create", exact: true }).click();
        expect((await createdRequest).postDataJSON()).toMatchObject({ name: hostName, setId: "BT26" });
        const code = await host.getByTestId("private-sealed-code").innerText();
        const own = (await (await host.request.get(`${api}/private-sealed/${code}`)).json()) as PrivateSealedView;
        expect(own.players).toEqual([hostName]);
        expect(own.seat).toBe(0);
        await guest.goto(`/play?privateSealed=${code}`, { waitUntil: "domcontentloaded" });
        await expect(guest.getByRole("button", { name: "Join", exact: true })).toBeEnabled();
        const guestName = await guest.evaluate(() => JSON.parse(localStorage.getItem("aegis:player")!).name as string);
        await expect(guest.getByRole("textbox", { name: /player name/i })).toHaveCount(0);
        await expect(guest.getByRole("combobox", { name: "Booster series" })).toHaveCount(0);
        await guest.screenshot({ path: `${evidence}/join-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
        await guest.getByRole("button", { name: "Join", exact: true }).click();
        await expect(guest.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
        const other = (await (await guest.request.get(`${api}/private-sealed/${code}`)).json()) as PrivateSealedView;
        expect(other.players).toEqual([hostName, guestName]);
        expect(other.seat).toBe(1);
        expect(other.pool.configuration).toEqual(own.pool.configuration);
        const status = guest.locator(".private-sealed__status");
        await expect(status).toContainText(`${hostName} · ${guestName} · 0 – 0`);
        await expect(guest.locator("[data-pool-card]")).toHaveCount(0);
        await expect(guest.getByRole("button", { name: "Open packs", exact: true })).toBeVisible();
        expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await guest.screenshot({ path: `${evidence}/joined-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
        await guest.reload({ waitUntil: "domcontentloaded" });
        await expect(guest.locator(".private-sealed__status")).toContainText(`${hostName} · ${guestName}`);
        expect(await guest.evaluate(() => JSON.parse(localStorage.getItem("aegis:player")!).name)).toBe(guestName);
        const resumed = (await (await guest.request.get(`${api}/private-sealed/${code}`)).json()) as PrivateSealedView;
        expect(resumed.seat).toBe(1);
        expect(resumed.pool.packs).toEqual(other.pool.packs);
        const cookie = (await guestContext.cookies()).find((entry) => entry.name === "aegis_private_sealed")!;
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.sameSite).toBe("Strict");
        expect(await guest.evaluate(() => document.cookie)).not.toContain(cookie.value);
        expect(errors).toEqual([]);
        await writeFile(
          `${evidence}/guests-${width}-${dark ? "dark" : "light"}.json`,
          JSON.stringify(
            {
              hostName,
              guestName,
              seats: [own.seat, other.seat],
              setId: own.pool.configuration.setId,
              stableReload: true,
              errors,
            },
            null,
            2,
          ),
        );
      } finally {
        await Promise.all([hostContext.close(), guestContext.close()]);
      }
    });
  }
}

test("infers the signed-in display name from the existing account session rather than guest storage", async ({
  browser,
}) => {
  const account = await backend.accounts.accountForIdentity("email", "sealed-no-name@example.invalid", "Account Tamer");
  const session = await backend.accounts.issueSession(account);
  const context = await browser.newContext();
  try {
    await context.addCookies([{ name: "aegis_session", value: session.id, url: api, httpOnly: true, sameSite: "Lax" }]);
    const page = await context.newPage();
    await page.addInitScript(() =>
      localStorage.setItem("aegis:player", JSON.stringify({ name: "Stored Guest", color: "Blue", shards: 0 })),
    );
    await page.goto("/play", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open the player menu", exact: true }).click();
    await expect(page.getByText("Account Tamer", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await selectPrivateSealedFormat({ page: page });
    await expect(page.getByRole("textbox", { name: /player name/i })).toHaveCount(0);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    const code = await page.getByTestId("private-sealed-code").innerText();
    const own = (await (await page.request.get(`${api}/private-sealed/${code}`)).json()) as PrivateSealedView;
    expect(own.players).toEqual([account.displayName]);
    expect(JSON.stringify(own)).not.toContain(account.id);
    expect(JSON.stringify(own)).not.toContain(session.id);
    await writeFile(
      `${evidence}/account.json`,
      JSON.stringify({ displayName: own.players[0], seat: own.seat, noAccountIdOrSessionInView: true }, null, 2),
    );
  } finally {
    await context.close();
  }
});
