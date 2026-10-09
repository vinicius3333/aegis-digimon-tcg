import { test, expect } from "./scenario-page";

for (const accept of [true, false]) {
  test(`GitHub #5380 / #5361: Growlmon X recovery after security deletion (accept=${accept})`, async ({ scenario }) => {
    await scenario.open("arena-growlmon-deletion-5361");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await scenario.evolve("Growlmon (X Antibody)", "dev-perm-0-5361-growlmon");
    await scenario.resolveUntil(
      (s) => s.players[0]!.battleArea[0]?.topCard.cardId === "EX8-012" && !s.pendingDecision,
      (d) => (d.kind === "selectCards" ? { cardId: "BT1-010" } : {}),
    );
    await scenario.attack("dev-perm-0-5361-growlmon");
    await scenario.resolveUntil(
      (s) => !s.combatWindow && !s.pendingDecision && s.players[0]!.trash.some((c) => c.cardId === "EX8-012"),
      (d) => (d.sourceCardId === "EX8-012" ? { accept, cardId: "EX8-009" } : { accept: false }),
    );
    const final = await scenario.snapshot();
    expect(final.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX8-009")).toBe(accept);
    expect(final.players[0]!.trash.some((c) => c.cardId === "EX8-009")).toBe(!accept);
    expect(final.players[1]!.securityCount).toBe(2);
    expect((await scenario.presentation()).events.filter((e) => e.kind === "attackEnded")).toHaveLength(1);
    await scenario.healthy();
  });
}
