import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 0 });

test("GitHub #5408: Ruin Mode recovers and hatches after its attack with a Tamer", async ({ scenario }) => {
  await scenario.open("arena-github-5408-ruin-mode-hatch");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const ruin = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX4-074")!;
  await scenario.attack(ruin.permanentId);
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && !s.combatWindow && s.players[0]!.breeding?.topCard.cardId === "BT1-006",
  );
  const after = await scenario.snapshot();
  expect(after.players[0]!.trash.some((c) => c.instanceId === ruin.topCard.instanceId)).toBe(true);
  expect(after.players[0]!.securityCount).toBe(before.players[0]!.securityCount + 1);
  expect(after.players[1]!.battleArea).toHaveLength(0);
  await scenario.healthy();
});

test("GitHub #5372: Progress protection control resolves a reactive deletion without losing its attacker", async ({
  scenario,
}) => {
  await scenario.open("arena-github-5372-progress-protection");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const attacker = (await scenario.snapshot()).players[0]!.battleArea[0]!;
  await scenario.attack(attacker.permanentId);
  await scenario.resolveUntil((s) => !s.pendingDecision && !s.combatWindow && s.players[1]!.securityCount === 4);
  const after = await scenario.snapshot();
  expect(after.players[0]!.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
  expect(after.players[1]!.battleArea[0]!.stack).toHaveLength(0);
  await scenario.healthy();
});

test("GitHub #5371: Examon's immediate battle resolves before Raid from its DNA attack", async ({ scenario, page }) => {
  await scenario.open("arena-github-5371-examon-battle-before-raid");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const first = before.players[1]!.battleArea.find((p) => p.topCard.cardId === "BT1-013")!;
  const raid = before.players[1]!.battleArea.find((p) => p.topCard.cardId === "BT1-010")!;
  await scenario.hand("Examon");
  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  for (const material of before.players[0]!.battleArea) {
    const card = page.locator(`[data-id="${material.permanentId}"][role="button"]`);
    if (!(await card.locator(".game-permanent__material-order").count())) {
      await card.focus();
      await card.press("Enter");
    }
  }
  await page
    .getByRole("region", { name: /DNA Digivolution available/i })
    .getByRole("button", { name: "DNA Digivolve", exact: true })
    .click();
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && !s.combatWindow && s.players[1]!.securityCount === 3,
    (d) => ({ accept: true, ...(d.promptText.includes("battle") ? { cardId: "BT1-013" } : {}) }),
  );
  const events = (await scenario.presentation()).events;
  const deletion = events.findIndex(
    (e) => e.kind === "cardsMoved" && e.deletedPermanents?.some((p) => p.permanentId === first.permanentId),
  );
  const redirect = events.findIndex(
    (e) =>
      e.kind === "attackDeclared" &&
      e.redirected &&
      e.target.kind === "permanent" &&
      e.target.permanentId === raid.permanentId,
  );
  expect(deletion).toBeGreaterThanOrEqual(0);
  expect(redirect).toBeGreaterThan(deletion);
  expect((await scenario.snapshot()).players[1]!.battleArea).toHaveLength(0);
  await scenario.healthy();
});

for (const bounce of [false, true]) {
  test(`GitHub #5378: Imperialdramon security-return control (bounce=${bounce})`, async ({ scenario }) => {
    await scenario.open(
      bounce ? "arena-github-5378-imperialdramon-security-bounce" : "arena-github-5378-imperialdramon-no-bounce",
    );
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const imperial = (await scenario.snapshot()).players[0]!.battleArea[0]!;
    await scenario.attack(imperial.permanentId);
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && !s.combatWindow && s.players[1]!.securityCount === (bounce ? 2 : 4),
    );
    const human = (await scenario.snapshot()).players[0]!;
    expect(human.hand.some((c) => c.instanceId === imperial.topCard.instanceId)).toBe(bounce);
    expect(human.battleArea.some((p) => p.permanentId === imperial.permanentId)).toBe(!bounce);
    expect(human.trash.filter((c) => imperial.stack.some((source) => source.instanceId === c.instanceId))).toHaveLength(
      bounce ? 2 : 0,
    );
    await scenario.healthy();
  });
}
