import { test, expect } from "./scenario-page";

for (const [destination, acceptCost] of [
  ["BT1-014", true],
  ["BT1-088", true],
  ["BT1-088", false],
] as const) {
  test(`Bagramon keeps physical materials and places the victim under ${destination} (trash sources: ${acceptCost})`, async ({
    scenario,
    page,
  }) => {
    test.setTimeout(120_000);
    await scenario.open("arena-ex10-bagramon-materials-destination");
    await scenario.resolveUntil(
      (s) => s.phase === "Main" && !s.pendingDecision,
      () => ({ accept: false }),
    );
    const initial = await scenario.snapshot();
    const expander = initial.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX10-064")!;
    const victim = initial.players[1]!.battleArea.find((p) => p.topCard.cardId === "BT1-009")!;
    const host = initial.players[1]!.battleArea.find((p) => p.topCard.cardId === destination)!;
    await scenario.play("Bagramon", "Digimon");
    await page
      .getByRole("dialog", { name: "Yuu Amano & Nene Amano · effect", exact: true })
      .getByRole("button", { name: "Yes, activate", exact: true })
      .click();
    const materials = page.getByRole("dialog", { name: "＜DigiXros＞ Bagramon", exact: true });
    await materials
      .getByRole("button", { name: /\(under Tamer\)$/ })
      .filter({ has: page.getByRole("img", { name: "Lilithmon", exact: true }) })
      .click();
    await materials.getByRole("button", { name: /\(trash\)$/ }).click();
    await materials.getByRole("button", { name: "DigiXros (2 cards)", exact: true }).click();
    let targetNumber = 0;
    await scenario.resolveUntil(
      (s) => s.turnSeat === 1 && !s.pendingDecision,
      (d) => {
        if (d.kind === "chooseTargets")
          return { instanceId: ++targetNumber === 1 ? victim.permanentId : host.permanentId };
        if (d.kind === "optional" && d.options.timing === "AllTurns") return { accept: acceptCost };
        return {};
      },
    );
    const final = await scenario.snapshot();
    const bagramon = final.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX10-056")!;
    expect(final.memory).toBe(7);
    const materialIds = ["dev-stack-0-bagramon-expander-0", "dev-bagramon-trash-material"];
    expect(bagramon.stack.map((c) => c.instanceId).sort()).toEqual(acceptCost ? [] : materialIds.sort());
    expect(
      final.players[0]!.battleArea.find((p) => p.permanentId === expander.permanentId)!.stack.map((c) => c.instanceId),
    ).toEqual(["dev-stack-0-bagramon-expander-1"]);
    expect(final.players[0]!.battleArea.find((p) => p.permanentId === expander.permanentId)!.isSuspended).toBe(true);
    expect(
      final.players[1]!.battleArea.find((p) => p.permanentId === host.permanentId)!.stack.map((c) => c.instanceId),
    ).toEqual([victim.topCard.instanceId, ...host.stack.map((c) => c.instanceId)]);
    expect(final.players[1]!.battleArea.some((p) => p.permanentId === victim.permanentId)).toBe(false);
    expect(final.players[1]!.securityCount).toBe(acceptCost ? 4 : 5);
    await scenario.healthy();
  });
}
