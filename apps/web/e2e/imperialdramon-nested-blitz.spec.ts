import { test, expect } from "./scenario-page";
import { GamePage } from "./game-page";

for (const attack of [true, false]) {
  test(`Imperialdramon nested end-turn DNA and Blitz (attack: ${attack})`, async ({ scenario, page }) => {
    test.setTimeout(120_000);
    await scenario.open("arena-issue-5353-imperialdramon-nested-blitz");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const initial = await scenario.snapshot();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await new GamePage(page).dragCardTo(/^Dinobeemon$/i, page.locator('[data-drop="battle-you"]'));
    const dna = page.getByRole("region", { name: /DNA Digivolution available/i });
    await expect(dna).toBeVisible();
    for (const cardId of ["EX3-008", "P-110"]) {
      const permanent = initial.players[0]!.battleArea.find((p) => p.topCard.cardId === cardId)!;
      const card = page.locator(`[data-id="${permanent.permanentId}"][role="button"]`);
      if (!(await card.locator(".game-permanent__material-order").count())) {
        await card.focus();
        await card.press("Enter");
      }
      await expect(card.locator(".game-permanent__material-order")).toBeVisible();
    }
    await dna.getByRole("button", { name: "DNA Digivolve", exact: true }).click();
    await scenario.resolveUntil(
      (s) => s.players[1]!.securityCount === 2 && !s.pendingDecision && !s.combatWindow,
      (d) => {
        if (d.kind === "selectCards" && d.options.candidateInstanceIds?.includes("player"))
          return { instanceId: "player" };
        if (d.kind === "selectCards") return { cardId: "BT20-016" };
        if (d.kind === "chooseTargets") return { cardId: "BT20-016" };
        return {};
      },
    );
    expect((await scenario.snapshot()).memory).toBe(2);
    await scenario.play("Titamon", "Digimon");
    await scenario.resolveUntil(
      (s) => !!s.pendingDecision && JSON.parse(s.pendingDecision.payloadJson || "{}").promptKey === "activateBlitz",
      (d) => (d.kind === "selectCards" ? { cardId: "EX3-063" } : {}),
    );
    const atBlitz = await scenario.snapshot();
    expect(atBlitz.turnSeat).toBe(0);
    expect(atBlitz.memory).toBe(-8);
    const dragon = atBlitz.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX3-063")!;
    expect(dragon.stack.map((c) => c.cardId)).toEqual(
      expect.arrayContaining(["EX3-008", "P-110", "BT16-077", "BT20-016"]),
    );
    await page.getByRole("button", { name: attack ? "Yes, activate" : "No, decline", exact: true }).click();
    if (attack) {
      await expect
        .poll(
          async () =>
            (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.permanentId === dragon.permanentId)!
              .canAttackPlayer,
        )
        .toBe(true);
      expect((await scenario.snapshot()).turnSeat).toBe(0);
      await scenario.attack(dragon.permanentId);
    }
    // Two security battles, their inherited clauses and the next turn's ribbons
    // are consecutive scenes; each still must finish without any gate expiry.
    await scenario.resolveUntil(
      (s) => s.turnSeat === 1 && !s.pendingDecision,
      () => ({}),
      25_000,
    );
    const probe = await scenario.presentation();
    expect(probe.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(attack ? 2 : 1);
    expect(probe.events.filter((e) => e.kind === "securityChecked")).toHaveLength(attack ? 3 : 1);
    expect((await scenario.snapshot()).players[1]!.securityCount).toBe(attack ? 0 : 2);
    expect(probe.events.map((e) => e.kind).lastIndexOf("attackEnded")).toBeLessThan(
      probe.events.map((e) => e.kind).lastIndexOf("turnEnded"),
    );
    // The accepted Blitz resolves two consecutive security battle scenes inside
    // one resumed effect. Bound that aggregate while retaining per-flight limits.
    await scenario.healthy({ resumedEffectBudgets: attack ? { "effect-unit-resettle-4": 12_000 } : {} });
  });
}
