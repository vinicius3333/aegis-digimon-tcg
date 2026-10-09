import { test, expect } from "./scenario-page";

for (const acceptAlliance of [true, false]) {
  test(`Alliance survives attacker evolution (accepted: ${acceptAlliance})`, async ({ scenario, page }) => {
    test.setTimeout(120_000);
    await scenario.open("arena-github5320-alliance-after-evolution");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const initial = await scenario.snapshot();
    const host = initial.players[0]!.battleArea[0]!;
    await scenario.evolve("Sanzomon", host.permanentId);
    await scenario.resolveUntil(
      (s) => s.combatWindow?.kind === "alliance",
      (d) => {
        if (d.kind === "orderTriggers")
          return {
            triggerCardId: d.options.triggerCardIds?.includes("EX12-056")
              ? "EX12-056"
              : d.options.triggerCardIds?.includes("EX12-002")
                ? "EX12-002"
                : undefined,
          };
        if (d.options.candidateInstanceIds?.includes(host.permanentId)) return { instanceId: host.permanentId };
        if (
          d.options.candidateInstanceIds?.some((id) =>
            initial.players[0]!.hand.some((c) => c.instanceId === id && c.cardId === "EX12-056"),
          )
        )
          return { cardId: "EX12-056" };
        if (
          d.options.candidateInstanceIds?.some((id) =>
            initial.players[0]!.hand.some((c) => c.instanceId === id && c.cardId === "EX12-034"),
          )
        )
          return { cardId: "EX12-034" };
        return {};
      },
    );
    await expect(page.getByRole("region", { name: "Alliance window", exact: true })).toBeVisible();
    const evolved = await scenario.snapshot();
    expect(evolved.players[0]!.battleArea.find((p) => p.permanentId === host.permanentId)!.topCard.cardId).toBe(
      "EX12-034",
    );
    if (acceptAlliance) {
      const ally = evolved.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX12-056")!;
      await page.locator(`[data-id="${ally.permanentId}"][role="button"]`).click();
      await page.getByRole("button", { name: "Use Alliance", exact: true }).click();
    } else await page.getByRole("button", { name: /^Pass$/i }).click();
    await scenario.resolveUntil(
      (s) => s.players[1]!.securityCount === (acceptAlliance ? 3 : 4) && !s.pendingDecision && !s.combatWindow,
    );
    const probe = await scenario.presentation();
    const checks = probe.events.filter((e) => e.kind === "securityChecked");
    expect(checks).toHaveLength(acceptAlliance ? 2 : 1);
    if (acceptAlliance) expect(checks[0]).toMatchObject({ battle: { attackerDP: 19000 } });
    expect((await scenario.snapshot()).memory).toBe(1);
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await scenario.resolveUntil((s) => s.turnSeat === 1 && !s.pendingDecision);
    const final = await scenario.snapshot();
    const attacker = final.players[0]!.battleArea.find((p) => p.permanentId === host.permanentId)!;
    expect(attacker.currentDP).toBe(12000);
    expect(attacker.keywords).not.toContain("Alliance");
    await scenario.healthy();
  });
}
