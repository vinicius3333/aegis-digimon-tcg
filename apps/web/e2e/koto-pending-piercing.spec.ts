import { test, expect } from "./scenario-page";

test.use({ botOptionalScript: { sourceCardId: "EX13-057", answers: [false, true] } });
test("Koto preserves pending Piercing through a protected block and pays one security", async ({ scenario, page }) => {
  test.setTimeout(120_000);
  await scenario.open("arena-koto-grademon-pending-piercing");
  await scenario.resolveUntil(
    (s) => s.phase === "Main" && !s.pendingDecision,
    () => ({ accept: false }),
  );
  const initial = await scenario.snapshot();
  const attacker = initial.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT25-049")!;
  await scenario.hand("Monarchlizamon");
  await page.getByRole("button", { name: "Play Option", exact: true }).click();
  await page.getByRole("button", { name: "Use as Option", exact: true }).click();
  await scenario.resolveUntil(
    (s) => s.players[1]!.securityCount === 1 && !s.pendingDecision && !s.combatWindow,
    (d) => {
      if (/place|De-Digivolve/i.test(d.promptText)) return { accept: false };
      if (d.options.candidateInstanceIds?.includes(attacker.permanentId)) return { instanceId: attacker.permanentId };
      if (d.kind === "chooseTargets") return { cardId: "BT20-053" };
      return {};
    },
  );
  const final = await scenario.snapshot();
  const probe = await scenario.presentation();
  expect(final.players[0]!.battleArea.find((p) => p.permanentId === attacker.permanentId)!.topCard.cardId).toBe(
    "BT25-057",
  );
  expect(final.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX13-060")).toBe(true);
  expect(final.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT20-053")).toBe(false);
  expect(probe.events.filter((e) => e.kind === "securityChecked")).toHaveLength(2);
  expect(probe.events.filter((e) => e.kind === "battleCompared" && e.effectBattle !== undefined)).toHaveLength(1);
  expect(probe.events.filter((e) => e.kind === "attackEnded")).toHaveLength(1);
  expect(probe.events.filter((e) => e.kind === "blocked")).toHaveLength(1);
  expect(probe.events.filter((e) => e.kind === "cardsMoved" && e.from === "security" && e.to === "trash")).toHaveLength(
    1,
  );
  expect(probe.visible?.players[1].securityCount).toBe(1);
  await scenario.healthy();
});
