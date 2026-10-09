import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 6 });
import { GamePage } from "./game-page";

for (const transformed of [true, false]) {
  test(`Examon DNA uses current material colors (Wingdramon transformed=${transformed})`, async ({
    scenario,
    page,
  }) => {
    await scenario.open(
      transformed
        ? "arena-discord-1557631388650315826-sukamon-dna-materials"
        : "arena-discord-1557631388650315826-sukamon-dna-control",
    );
    await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
    const initial = await scenario.snapshot();
    const examon = initial.players[0]!.hand.find((c) => c.cardId === "EX13-045")!;
    expect(examon.dnaDigivolveRoutes).toHaveLength(transformed ? 0 : 1);
    if (transformed) {
      const material = initial.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-021")!;
      expect(material.currentDP).toBe(3000);
      expect(material.originalColorsOverride).toEqual(["White"]);
      expect(material.originalNameOverride).toBe("Sukamon");
      await scenario.hand("Examon");
      await expect(page.getByRole("button", { name: "DNA Digivolve", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("button", { name: /^end turn$/i }).click();
      await scenario.resolveUntil(
        (s) => s.turnSeat === 0 && s.turnCount === 5 && s.phase === "Breeding" && !s.pendingDecision,
        () => ({ accept: false }),
      );
      await page.getByRole("button", { name: /^end breeding$/i }).click();
      await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
      const after = await scenario.snapshot();
      expect(after.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX13-021", "EX13-044"]);
      expect(after.players[0]!.hand.find((c) => c.cardId === "EX13-045")!.dnaDigivolveRoutes).toHaveLength(1);
      expect(
        (await scenario.presentation()).events.filter((e) => e.kind === "digivolved" && e.cardId === "EX13-045"),
      ).toHaveLength(0);
    }
    {
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
      await new GamePage(page).dragCardTo(/^Examon$/i, page.locator('[data-drop="battle-you"]'));
      const dna = page.getByRole("region", { name: /DNA Digivolution available/i });
      await expect(dna).toBeVisible();
      for (const material of initial.players[0]!.battleArea) {
        const card = page.locator(`[data-id="${material.permanentId}"][role="button"]`);
        if (!(await card.locator(".game-permanent__material-order").count())) {
          await card.focus();
          await card.press("Enter");
        }
        await expect(card.locator(".game-permanent__material-order")).toBeVisible();
      }
      await dna.getByRole("button", { name: "DNA Digivolve", exact: true }).click();
      await scenario.resolveUntil(
        (s) =>
          s.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-045") &&
          !s.pendingDecision &&
          !s.combatWindow,
        () => ({ accept: false }),
      );
      const result = (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-045")!;
      expect(result.stack.map((c) => c.cardId)).toEqual(["EX13-008", "EX13-021", "EX13-044"]);
      expect((await scenario.snapshot()).players[0]!.hand.some((c) => c.instanceId === examon.instanceId)).toBe(false);
    }
    await scenario.healthy();
  });
}
