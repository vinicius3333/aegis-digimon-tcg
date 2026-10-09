import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 4 });

test("GitHub #5391: Raid targets an immune Atratusmon and finishes battle without security checks", async ({
  scenario,
}) => {
  await scenario.open("arena-raid-immune-atratusmon");
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const atratus = before.players[1]!.battleArea.find((p) => p.topCard.cardId === "ST23-09")!;
  expect(atratus.immuneToOpponentDigimonEffects).toBe(true);
  expect(atratus.isSuspended).toBe(false);
  await scenario.attack("dev-perm-0-new-report-jupiter");
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && !s.combatWindow && s.players[1]!.battleArea.length === 0,
    (d) => ({ accept: !/Engage|Alliance/i.test(d.promptText), cardId: "ST23-09" }),
  );
  const probe = await scenario.presentation();
  expect(
    probe.events.some(
      (e) =>
        e.kind === "attackDeclared" &&
        e.redirected &&
        e.target.kind === "permanent" &&
        e.target.permanentId === atratus.permanentId,
    ),
  ).toBe(true);
  expect((await scenario.snapshot()).players[1]!.securityCount).toBe(5);
  expect((await scenario.snapshot()).players[0]!.battleArea[0]!.topCard.cardId).toBe("BT26-033");
  expect(probe.events.filter((e) => e.kind === "securityChecked")).toHaveLength(0);
  await scenario.healthy();
});
