import { test, expect, type DecisionPolicy } from "./scenario-page";

const TARGET_A = "dev-perm-1-metalgreymon-target-a";
const TARGET_B = "dev-perm-1-metalgreymon-target-b";
const BASE = "dev-perm-0-metalgreymon-base";

type Stripped = { permanentId: string; reason: string; sourceCardId?: string };

for (const colors of [2, 4] as const) {
  test(`Discord 1557624042733969509: BT21 MetalGreymon with ${colors} Tamer colors de-digivolves only the one chosen Digimon`, async ({
    scenario,
    page,
  }) => {
    test.setTimeout(120_000);
    const steps = colors / 2;
    const resultTop = colors === 4 ? "BT21-042" : "BT21-044";
    await scenario.open(`arena-bt21-metalgreymon-one-target-${colors === 4 ? "four" : "two"}-colors`);
    await scenario.resolveUntil(
      (s) => s.phase === "Main" && !s.pendingDecision,
      () => ({ accept: false }),
    );

    const targetChoices: { timing?: string; candidates: string[]; max?: number }[] = [];
    const pickRecipient =
      (recipient: string): DecisionPolicy =>
      async (decision) => {
        const timing = decision.options.timing;
        if (
          decision.kind === "chooseTargets" &&
          decision.sourceCardId === "BT21-061" &&
          (timing === "OnPlay" || timing === "WhenDigivolving")
        ) {
          targetChoices.push({ timing, candidates: decision.options.candidateInstanceIds!, max: decision.options.max });
          // One recipient per activation: the picker offers no way to skip or add a second target.
          await expect(page.getByRole("button", { name: /^(No selection|Pass · no selection|Pass)$/i })).toHaveCount(0);
          return { instanceId: recipient };
        }
        // Decline optional Tamer effects and the optional attack after <Alliance>.
        return { accept: false };
      };
    const strippedBy = async () =>
      (await scenario.presentation()).events
        .map((event) => (event as { strippedStackTops?: Stripped }).strippedStackTops)
        .filter(
          (stripped): stripped is Stripped =>
            stripped?.reason === "deDigivolve" && stripped.sourceCardId === "BT21-061",
        )
        .map((stripped) => stripped.permanentId);
    const opponentStack = async (permanentId: string) => {
      const permanent = (await scenario.snapshot()).players[1]!.battleArea.find((p) => p.permanentId === permanentId)!;
      return { top: permanent.topCard.cardId, sources: permanent.stack.length };
    };

    const memoryAtMain = (await scenario.snapshot()).memory;
    await page.locator('[data-hand-instance-id="dev-metalgreymon-play"]').focus();
    await page.locator('[data-hand-instance-id="dev-metalgreymon-play"]').press("Enter");
    await page.getByRole("button", { name: "Play Digimon", exact: true }).click();
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === "dev-metalgreymon-play") &&
        s.players[1]!.battleArea.find((p) => p.permanentId === TARGET_A)!.topCard.cardId === resultTop,
      pickRecipient(TARGET_A),
    );
    expect((await scenario.snapshot()).memory).toBe(memoryAtMain - 7);
    expect(targetChoices).toEqual([{ timing: "OnPlay", candidates: [TARGET_A, TARGET_B], max: 1 }]);
    expect(await opponentStack(TARGET_A)).toEqual({ top: resultTop, sources: 2 - steps });
    expect(await opponentStack(TARGET_B)).toEqual({ top: "BT21-045", sources: 2 });
    expect(await strippedBy()).toEqual(Array(steps).fill(TARGET_A));

    // A separate activation may choose the other Digimon, and still affects only that one.
    await page.locator('[data-hand-instance-id="dev-metalgreymon-evolve"]').focus();
    await page.locator('[data-hand-instance-id="dev-metalgreymon-evolve"]').press("Enter");
    await page.getByRole("button", { name: "Digivolve", exact: true }).click();
    await page.locator(`[data-drop="perm-you"][data-id="${BASE}"]`).click();
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.players[0]!.battleArea.find((p) => p.permanentId === BASE)!.topCard.cardId === "BT21-061" &&
        s.players[1]!.battleArea.find((p) => p.permanentId === TARGET_B)!.topCard.cardId === resultTop,
      pickRecipient(TARGET_B),
    );
    expect((await scenario.snapshot()).memory).toBe(memoryAtMain - 10);
    expect(targetChoices).toEqual([
      { timing: "OnPlay", candidates: [TARGET_A, TARGET_B], max: 1 },
      { timing: "WhenDigivolving", candidates: [TARGET_A, TARGET_B], max: 1 },
    ]);
    expect(await opponentStack(TARGET_A)).toEqual({ top: resultTop, sources: 2 - steps });
    expect(await opponentStack(TARGET_B)).toEqual({ top: resultTop, sources: 2 - steps });
    expect(await strippedBy()).toEqual([...Array(steps).fill(TARGET_A), ...Array(steps).fill(TARGET_B)]);
    expect((await scenario.presentation()).events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);
    const final = await scenario.snapshot();
    expect(final.turnSeat).toBe(0);
    expect(final.phase).toBe("Main");
    await scenario.healthy();
  });
}
