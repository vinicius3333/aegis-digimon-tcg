import { test, expect } from "./scenario-page";

test("GitHub #5384: WarGrowlmon plays Takato at End of Attack after Ulforce evades", async ({ scenario }) => {
  await scenario.open("arena-wargrowlmon-evaded-block");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack("dev-perm-0-report-war");
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-080") && !s.pendingDecision && !s.combatWindow,
    (d) => (d.kind === "selectCards" ? { cardId: "BT17-080" } : {}),
  );
  const final = await scenario.snapshot();
  expect(final.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX13-023")).toBe(true);
  expect(final.players[1]!.securityCount).toBe(5);
  expect(final.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-013")!.currentDP).toBe(11000);
  const events = (await scenario.presentation()).events;
  expect(events.filter((e) => e.kind === "blocked")).toHaveLength(1);
  expect(events.some((e) => e.kind === "evadeResolved" && e.accepted)).toBe(true);
  expect(events.filter((e) => e.kind === "attackEnded")).toHaveLength(1);
  expect(events.some((e) => e.kind === "securityChecked")).toBe(false);
  await scenario.healthy();
});
