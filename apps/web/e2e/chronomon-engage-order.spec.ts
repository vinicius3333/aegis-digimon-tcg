import { test, expect } from "./scenario-page";

test("Chronomon presents the first security check before Engage and ends the turn after the second attack", async ({
  scenario,
  page,
}) => {
  test.setTimeout(120_000);
  await scenario.open("arena-chronomon-engage-order");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const initial = await scenario.snapshot();
  const host = initial.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT26-013")!;
  await scenario.evolve("Butenmon", host.permanentId, true);
  let engageChecks = -1;
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision,
    async (d) => {
      if (d.kind === "optional" && d.options.timing === "EndOfYourTurn") {
        await expect(page.getByRole("button", { name: "Yes, activate", exact: true })).toBeVisible();
        const before = await scenario.presentation();
        engageChecks = before.events.filter((e) => e.kind === "securityChecked").length;
        expect(engageChecks).toBe(1);
        expect(before.events.filter((e) => e.kind === "attackEnded")).toHaveLength(1);
        expect(before.visible?.players[1].securityCount).toBe(4);
      }
      if (d.kind === "orderTriggers")
        return { triggerCardId: d.options.triggerCardIds?.includes("BT26-015") ? "BT26-015" : undefined };
      if (d.kind === "chooseOption") return { choice: 1 };
      if (d.options.candidateInstanceIds?.includes("engage-filler-0")) return { instanceId: "engage-filler-0" };
      return {};
    },
  );
  const probe = await scenario.presentation();
  const final = await scenario.snapshot();
  expect(final.players[0]!.battleArea.find((p) => p.permanentId === host.permanentId)!.topCard.cardId).toBe("BT26-016");
  expect(final.players[1]!.securityCount).toBe(3);
  expect(engageChecks).toBe(1);
  expect(probe.events.filter((e) => e.kind === "securityChecked")).toHaveLength(2);
  expect(probe.events.filter((e) => e.kind === "attackEnded")).toHaveLength(2);
  expect(probe.events.map((e) => e.kind).lastIndexOf("attackEnded")).toBeLessThan(
    probe.events.map((e) => e.kind).lastIndexOf("turnEnded"),
  );
  await scenario.healthy({ timedCatchUp: true });
});
