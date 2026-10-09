import { test, expect } from "./scenario-page";

const RECIPIENT = "dev-perm-1-metalgreymon-recipient";
const OTHER = "dev-perm-1-metalgreymon-other";
const BASE = "dev-perm-0-metalgreymon-base";

// The opponent's turn (turn 2) runs; the bot is held from turn 4 on.
test.use({ holdBotAfterTurn: 4 });

for (const mode of ["play", "digivolve"] as const) {
  test(`Discord 1557600224011096104: EX12 MetalGreymon (${mode}) deletes, then forces the chosen opponent to attack at its Main start`, async ({
    scenario,
    page,
  }) => {
    test.setTimeout(150_000);
    await scenario.open(`arena-ex12-metalgreymon-forced-attack-${mode}`);
    await scenario.resolveUntil(
      (s) => s.phase === "Main" && !s.pendingDecision,
      () => ({ accept: false }),
    );
    const securityBefore = (await scenario.snapshot()).players[0]!.securityCount;

    if (mode === "play") await scenario.play("MetalGreymon", "Digimon");
    else await scenario.evolve("MetalGreymon", BASE, true);

    let grantCandidates: string[] | undefined;
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        !!s.players[1]!.battleArea.find((p) => p.permanentId === RECIPIENT)?.attacksAtStartOfMainPhase,
      async (decision) => {
        if (decision.kind === "chooseTargets" && decision.sourceCardId === "EX12-016" && decision.options.max === 1) {
          grantCandidates ??= decision.options.candidateInstanceIds;
          // The second step is mandatory: the grant offers no pass.
          await expect(page.getByRole("button", { name: /^(No selection|Pass · no selection|Pass)$/i })).toHaveCount(0);
          return { instanceId: RECIPIENT };
        }
        return { accept: false };
      },
    );
    const afterEffect = await scenario.snapshot();
    expect(afterEffect.memory).toBe(mode === "play" ? 3 : 7);
    // Step 1: the only 6000-DP-or-less Digimon is deleted. Step 2: the survivors (not breeding) are offered.
    expect(afterEffect.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([RECIPIENT, OTHER]);
    expect(grantCandidates).toEqual([RECIPIENT, OTHER]);
    const recipient = afterEffect.players[1]!.battleArea.find((p) => p.permanentId === RECIPIENT)!;
    const other = afterEffect.players[1]!.battleArea.find((p) => p.permanentId === OTHER)!;
    expect(recipient.grantedEffectTexts.join(" ")).toContain("[Start of Your Main Phase]");
    expect(other.attacksAtStartOfMainPhase).toBe(false);
    expect(afterEffect.players[1]!.breeding?.attacksAtStartOfMainPhase).toBeFalsy();
    await expect(page.locator(`[data-id="${RECIPIENT}"] [data-label="Must attack"]`)).toBeVisible();
    await expect(page.locator(`[data-id="${OTHER}"] [data-label="Must attack"]`)).toHaveCount(0);
    // The grant does not attack during the turn it is given.
    expect((await scenario.presentation()).events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);

    await page.getByRole("button", { name: /^end turn$/i }).click();
    await expect.poll(async () => (await scenario.snapshot()).turnSeat, { timeout: 60_000 }).toBe(1);
    await expect.poll(async () => (await scenario.snapshot()).turnSeat, { timeout: 90_000 }).toBe(0);
    // The server reaches our Breeding phase while the browser still presents the opponent's whole
    // turn (forced attack, further attacks, an Option); the visible control marks the catch-up.
    await expect(page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled({ timeout: 45_000 });
    await scenario.resolveUntil(
      (s) => s.turnSeat === 0 && s.phase === "Breeding" && !s.pendingDecision && !s.combatWindow,
      () => ({ accept: false }),
    );

    const events = (await scenario.presentation()).events;
    const opponentMain = events.findIndex((e) => e.kind === "phaseChanged" && e.turnSeat === 1 && e.phase === "Main");
    expect(opponentMain).toBeGreaterThan(-1);
    const opponentTurn = events.slice(opponentMain);
    const firstAction = opponentTurn.find((e) =>
      ["attackDeclared", "cardPlayed", "digivolved", "turnEnded"].includes(e.kind),
    );
    expect(firstAction).toMatchObject({ kind: "attackDeclared", seat: 1, attackerPermanentId: RECIPIENT });
    expect(
      opponentTurn.filter((e) => e.kind === "attackDeclared" && e.attackerPermanentId === RECIPIENT && !e.redirected),
    ).toHaveLength(1);

    const final = await scenario.snapshot();
    expect(final.players[0]!.securityCount).toBeLessThan(securityBefore);
    const finalRecipient = final.players[1]!.battleArea.find((p) => p.permanentId === RECIPIENT)!;
    // "until their turn ends": the grant and its badge expire with the opponent's turn.
    expect(finalRecipient.attacksAtStartOfMainPhase).toBe(false);
    expect(finalRecipient.grantedEffectTexts).toEqual([]);
    await expect(page.locator(`[data-id="${RECIPIENT}"] [data-label="Must attack"]`)).toHaveCount(0);
    await scenario.healthy();
  });
}
