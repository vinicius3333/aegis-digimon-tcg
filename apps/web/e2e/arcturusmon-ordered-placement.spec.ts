import { test, expect } from "./scenario-page";

test("Arcturusmon orders recovered sources after De-Digivolve and preserves the chosen bottom order", async ({
  scenario,
  page,
}) => {
  await scenario.open("arena-p240-arcturusmon-ordered-placement");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const initial = await scenario.snapshot();
  const base = initial.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX12-014")!;
  const enemy = initial.players[1]!.battleArea[0]!;
  await scenario.evolve("Arcturusmon", base.permanentId);
  let order: string[] = [];
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.find((p) => p.permanentId === base.permanentId)!.stack.length === 4 &&
      !s.pendingDecision,
    async (d) => {
      if (d.kind === "orderCards") {
        expect(d.options.orderDestination).toBe("stackBottom");
        order = [...d.options.candidateInstanceIds!].reverse();
        const panel = page.getByRole("dialog");
        await expect(panel.getByRole("button", { name: "Confirm order", exact: true })).toBeVisible();
        await panel
          .getByRole("button", { name: /^Move card up,/i })
          .last()
          .click();
        await expect(panel.getByRole("listitem").first()).toHaveAttribute("data-reorder-id", order[0]!);
      }
      return {};
    },
  );
  const final = await scenario.snapshot();
  expect(order).toHaveLength(2);
  const evolved = final.players[0]!.battleArea.find((p) => p.permanentId === base.permanentId)!;
  expect(evolved.topCard.cardId).toBe("P-240");
  expect(evolved.stack.slice(0, 2).map((c) => c.instanceId)).toEqual(order);
  expect(final.players[1]!.battleArea.find((p) => p.permanentId === enemy.permanentId)!.stack).toHaveLength(0);
  await scenario.healthy();
});
