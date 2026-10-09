import { test, expect } from "./scenario-page";

test("Revelation DP modifiers last through the pending attack and expire at turn pass", async ({ scenario }) => {
  await scenario.open("arena-github5344-revelation-expiry");
  await scenario.resolveUntil((s) => !s.pendingDecision && s.phase === "Main");
  const initial = await scenario.snapshot();
  await scenario.evolve("Mistymon", initial.players[0]!.battleArea[0]!.permanentId, true);
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision,
    (d) => (/add.*security/i.test(d.promptText) ? { accept: false } : {}),
  );
  const final = await scenario.snapshot();
  const probe = await scenario.presentation();
  const checked = probe.events.filter((e) => e.kind === "securityChecked");
  expect(checked).toHaveLength(1);
  expect(checked[0]).toMatchObject({ battle: { securityCardDP: 5000 } });
  expect(
    probe.boards.some(
      (frame) =>
        frame.visible.players[1].battleArea[0]?.currentDP === 1000 &&
        frame.visible.players[1].securityDpDelta === -5000,
    ),
  ).toBe(true);
  expect(final.players[1]!.battleArea[0]!.currentDP).toBe(12000);
  expect(final.players[1]!.securityDpDelta).toBe(0);
  expect(probe.visible?.players[1].battleArea[0]!.currentDP).toBe(12000);
  expect(probe.events.map((e) => e.kind).lastIndexOf("attackEnded")).toBeLessThan(
    probe.events.map((e) => e.kind).lastIndexOf("turnEnded"),
  );
  await scenario.healthy();
});
