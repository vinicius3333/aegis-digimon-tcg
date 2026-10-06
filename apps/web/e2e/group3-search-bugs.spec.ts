import { test, expect } from "@playwright/test";
import { startBrowserServer } from "./server";
const cases = [
  {
    id: "arena-issue-5142-bt10-087-search",
    name: "Taiki Kudo",
    expected: ["Shoutmon X7"],
    targets: ["Shoutmon X7", "ZeigGreymon"],
    boardSuspend: false,
    cardId: "BT10-087",
    orderRemainder: true,
  },
  {
    id: "arena-issue-5155-bt12-021-search",
    name: "Veemon",
    expected: ["Paildramon", "Davis Motomiya"],
    targets: ["Paildramon", "Davis Motomiya"],
    boardSuspend: false,
    cardId: "BT12-021",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5117-bt13-048-search",
    name: "Salamon",
    expected: ["Garurumon", "Gallantmon"],
    targets: ["Garurumon", "Gallantmon"],
    boardSuspend: false,
    cardId: "BT13-048",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5148-bt24-043-search",
    name: "Tapirmon",
    expected: ["Garurumon", "Shamanmon"],
    targets: ["Garurumon", "Shamanmon"],
    boardSuspend: false,
    cardId: "BT24-043",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5132-bt24-044-search",
    name: "Muchomon",
    expected: ["Shoto Kazama", "Biyomon"],
    targets: ["Shoto Kazama", "Biyomon"],
    boardSuspend: true,
    cardId: "BT24-044",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5121-bt24-058-search",
    name: "Blimpmon",
    expected: ["WarGrowlmon"],
    targets: ["WarGrowlmon"],
    boardSuspend: false,
    cardId: "BT24-058",
    orderRemainder: true,
  },
  {
    id: "arena-issue-5138-bt25-022-search",
    name: "Lunamon",
    expected: ["Cyclonemon", "Shamanmon"],
    targets: ["Cyclonemon", "Shamanmon"],
    boardSuspend: false,
    cardId: "BT25-022",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5131-bt3-093-search",
    name: "Davis Motomiya",
    expected: ["Shoutmon X7", "Paildramon"],
    targets: ["Shoutmon X7", "Paildramon"],
    boardSuspend: false,
    cardId: "BT3-093",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5108-ex12-073-search",
    name: "Giant Meat",
    expected: ["MetalEtemon"],
    targets: ["MetalEtemon"],
    boardSuspend: false,
    cardId: "EX12-073",
    orderRemainder: true,
  },
  {
    id: "arena-issue-5137-ex13-027-search",
    name: "Chuumon",
    expected: ["Sukamon"],
    targets: ["Sukamon", "Etemon"],
    boardSuspend: false,
    cardId: "EX13-027",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5107-ex2-008-search",
    name: "Guilmon",
    expected: ["WarGrowlmon", "Takato Matsuki"],
    targets: ["WarGrowlmon", "Takato Matsuki"],
    boardSuspend: false,
    cardId: "EX2-008",
    orderRemainder: true,
  },
  {
    id: "arena-issue-5109-ex4-038-search",
    name: "Agumon",
    expected: ["Greymon", "Garurumon"],
    targets: ["Greymon", "Garurumon"],
    boardSuspend: false,
    cardId: "EX4-038",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5135-st14-11-search",
    name: "Ai & Mako",
    expected: ["Aldamon"],
    targets: ["Aldamon"],
    boardSuspend: false,
    cardId: "ST14-11",
    orderRemainder: true,
  },
  {
    id: "arena-issue-5132-st18-04-search",
    name: "Pteromon",
    expected: ["Biyomon", "Vemmon"],
    targets: ["Biyomon", "Vemmon"],
    boardSuspend: false,
    cardId: "ST18-04",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5114-st20-02-search",
    name: "Biyomon",
    expected: ["Greymon", "Matt Ishida & T.K. Takaishi"],
    targets: ["Greymon", "Matt Ishida & T.K. Takaishi"],
    boardSuspend: false,
    cardId: "ST20-02",
    orderRemainder: false,
  },
  {
    id: "arena-issue-5152-lm-051-search",
    name: "Alexandrite Memory Boost!",
    expected: ["Greymon"],
    targets: ["Greymon"],
    boardSuspend: false,
    cardId: "LM-051",
    orderRemainder: true,
  },
  {
    id: "arena-issue-5132-lm-055-search",
    name: "Sprint Dash Training",
    expected: ["Greymon"],
    targets: ["Greymon"],
    boardSuspend: false,
    cardId: "LM-055",
    orderRemainder: false,
  },
] as const;

for (const [index, fixture] of cases.entries()) {
  test(`${fixture.id} shows selectable cards and returns to Main`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await page.setViewportSize(index % 2 ? { width: 390, height: 844 } : { width: 1366, height: 768 });
      await page.addInitScript(() => {
        localStorage.setItem("aegis:locale", "en");
        localStorage.setItem("aegis.action-confirmation.enabled", "false");
      });
      await page.goto(`/dev/arena?scenario=${fixture.id}`);
      await page.getByRole("button", { name: /^end breeding$/i }).click();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
      const card = page.getByTestId("hand").getByRole("button", { name: `Select ${fixture.name}`, exact: true });
      await card.focus();
      await card.press("Enter");
      await page.getByRole("button", { name: /^Play (Digimon|Tamer|Option)$/i }).click();
      if (fixture.boardSuspend) {
        await expect(page.getByRole("region", { name: "Confirm targets", exact: true })).toBeVisible();
        const target = page
          .locator('[data-drop="perm-you"]')
          .filter({ has: page.getByRole("img", { name: fixture.name, exact: true }) });
        await target.focus();
        await target.press("Enter");
        await page.getByRole("button", { name: "Confirm targets", exact: true }).click();
      }
      const panel = page
        .getByRole("dialog")
        .filter({ has: page.getByRole("button", { name: "Confirm targets", exact: true }) });
      for (const name of fixture.targets) {
        await expect(panel).toBeVisible();
        const candidate = panel
          .locator(".decision-overlay__candidate:not([disabled])")
          .filter({ has: page.getByRole("img", { name, exact: true }) });
        await expect(candidate).toBeVisible();
        await candidate.click();
        await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
      }
      if (fixture.cardId === "BT24-058") {
        await page.getByRole("button", { name: "Add to the hand", exact: true }).click();
        await page.getByRole("button", { name: /bottom.*deck/i }).click();
      }
      const order = page.getByRole("button", { name: "Confirm order", exact: true });
      if (fixture.orderRemainder) await order.click();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
      for (const name of fixture.expected)
        await expect(page.getByTestId("hand").getByRole("img", { name, exact: true })).toBeVisible();
    } finally {
      await page.close();
      await server.close();
    }
  });
}
