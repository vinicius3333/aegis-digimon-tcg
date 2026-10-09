import { test, expect } from "./scenario-page";

for (const link of [true, false]) {
  test(`Dan/Kanan continues after Sonic Shot's Link choice (link=${link})`, async ({ scenario, page }) => {
    await scenario.open("arena-bt24-sonic-shot-decline-link");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const initial = await scenario.snapshot();
    const host = initial.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT24-009")!;
    await page.getByRole("button", { name: /^end turn$/i }).click();
    let sawLink = false;
    await scenario.resolveUntil(
      (s) => s.turnSeat === 1 && !s.pendingDecision,
      (d) => {
        if (d.sourceCardId === "BT24-095" && d.kind === "chooseTargets") {
          sawLink = true;
          return { accept: link, instanceId: host.permanentId };
        }
        if (d.kind === "selectCards") return { cardId: "BT24-095" };
        if (d.options.selectionContext === "attackSource") return { accept: false };
        return {};
      },
    );
    expect(sawLink).toBe(true);
    const final = await scenario.snapshot();
    expect(
      final.players[0]!.battleArea.find((p) => p.permanentId === host.permanentId)!.linked.map((c) => c.instanceId),
    ).toEqual(link ? ["dev-sonic-shot-option"] : []);
    expect(final.players[0]!.trash.some((c) => c.instanceId === "dev-sonic-shot-option")).toBe(!link);
    expect(final.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT24-085")!.isSuspended).toBe(true);
    expect((await scenario.presentation()).events).toContainEqual(
      expect.objectContaining({ kind: "effectResolved", sourceCardId: "BT24-095" }),
    );
    await scenario.healthy();
  });
}
