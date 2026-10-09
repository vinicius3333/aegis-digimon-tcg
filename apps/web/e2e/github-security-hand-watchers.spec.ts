import { test, expect } from "./scenario-page";

for (const blocked of [false, true]) {
  test(`#5419: Dark Masters security placement ${blocked ? "respects Kongou" : "works without Kongou"}`, async ({
    scenario,
  }) => {
    await scenario.open(blocked ? "arena-github5419-kongou-prevention" : "arena-github5419-dark-masters-security");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    if (blocked) {
      const starter = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-009")!;
      await scenario.attack(starter.permanentId);
      await scenario.resolveUntil((s) => s.players[1]!.securityCount === 2 && !s.pendingDecision);
      await scenario.healthy();
    }
    for (const cardId of ["EX10-020", "EX10-035"]) {
      const master = before.players[0]!.battleArea.find((p) => p.topCard.cardId === cardId)!;
      await scenario.attack(master.permanentId);
      await scenario.resolveUntil(
        (s) => !s.players[0]!.battleArea.some((p) => p.permanentId === master.permanentId) && !s.pendingDecision,
      );
      const after = await scenario.snapshot();
      expect(after.players[0]!.trash.some((c) => c.instanceId === master.topCard.instanceId)).toBe(blocked);
      expect(after.players[0]!.security.some((c) => c.instanceId === master.topCard.instanceId && c.faceUp)).toBe(
        !blocked,
      );
      await scenario.healthy();
    }
  });
}

for (const [id, name, cardId] of [
  ["arena-github5420-metalgaruru-gallantmon", "MetalGarurumon", "EX12-035"],
  ["arena-github5420-omnimon-gallantmon", "Omnimon", "AD1-025"],
] as const) {
  test(`#5420: ${cardId} bottom-decks Gallantmon and trashes its sources`, async ({ scenario }) => {
    await scenario.open(id);
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    const target = before.players[1]!.battleArea[0]!;
    await scenario.evolve(name, before.players[0]!.battleArea[0]!.permanentId, cardId === "EX12-035");
    await scenario.resolveUntil(
      (s) => !s.players[1]!.battleArea.some((p) => p.permanentId === target.permanentId) && !s.pendingDecision,
    );
    const after = await scenario.snapshot();
    expect(after.players[1]!.deckCount).toBe(before.players[1]!.deckCount + 1);
    expect(after.players[1]!.trash.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining(target.stack.map((c) => c.instanceId)),
    );
    expect(after.players[1]!.trash.some((c) => c.instanceId === target.topCard.instanceId)).toBe(false);
    await scenario.healthy();
  });
}

for (const field of [false, true]) {
  test(`#5421: SkullMammothmon ${field ? "activates in the battle area" : "does not activate in hand"}`, async ({
    scenario,
  }) => {
    await scenario.open(field ? "arena-github5421-skullmammoth-field" : "arena-github5421-skullmammoth-hand");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await scenario.play("Fangmon", "Digimon");
    await scenario.resolveUntil(
      (s) =>
        s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT14-072") &&
        s.players[0]!.trash.some((c) => c.cardId === "BT1-009") &&
        !s.pendingDecision,
      (d) => ({ cardId: d.sourceCardId === "BT14-072" ? "BT1-009" : "BT10-074" }),
    );
    const after = await scenario.snapshot();
    expect(after.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT10-074")).toBe(field);
    expect(after.players[0]!.trash.some((c) => c.cardId === "BT10-074")).toBe(!field);
    await scenario.healthy();
  });
}
