import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 4 });

for (const id of ["arena-tuwarmon-opponent-blocker", "arena-chuuchuumon-opponent-blocker"]) {
  test(`Discord 1557955113648136222: ${id} grants Blocker only during the opposing turn`, async ({
    scenario,
    page,
  }) => {
    await scenario.open(id);
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    expect((await scenario.snapshot()).players[0]!.battleArea[0]!.keywords).not.toContain("Blocker");
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await expect.poll(async () => (await scenario.snapshot()).combatWindow?.kind).toBe("block");
    expect((await scenario.snapshot()).players[0]!.battleArea[0]!.keywords).toContain("Blocker");
    await page.locator('[data-id="dev-perm-0-report-tuwarmon-host"][role="button"]').click();
    await scenario.resolveUntil(
      (s) => s.turnSeat === 0 && s.phase === "Breeding" && !s.combatWindow && !s.pendingDecision,
    );
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const final = await scenario.snapshot();
    expect(final.players[0]!.securityCount).toBe(5);
    expect(final.players[0]!.battleArea[0]!.keywords).not.toContain("Blocker");
    expect(final.players[1]!.battleArea).toHaveLength(0);
    expect((await scenario.presentation()).events.filter((e) => e.kind === "blocked")).toHaveLength(1);
    await scenario.healthy();
  });
}
