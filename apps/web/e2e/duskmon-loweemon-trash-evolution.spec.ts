import { test, expect } from "./scenario-page";

const DUSKMON = "dev-perm-0-trash-hybrids-duskmon";
const LOWEEMON = "dev-perm-0-trash-hybrids-loweemon";
const DEMIDEVIMON = "dev-perm-0-trash-hybrids-rookie";
const UKKOMON = "dev-perm-0-trash-hybrids-ukkomon";
const VELGRMON_CARD = "trash-hybrids-BT18-079";
const KAISERLEOMON_CARD = "trash-hybrids-BT18-077";
const UKKOMON_CARD = "trash-hybrids-BT16-082";

test("Discord 1557790296379625482: Duskmon and Loweemon attack-digivolve into Velgrmon and KaiserLeomon from trash", async ({
  scenario,
  page,
}) => {
  test.setTimeout(150_000);
  await scenario.open("arena-discord-1557790296379625482-trash-hybrids");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  expect((await scenario.snapshot()).memory).toBe(2);

  // Velgrmon has no route into a level 4 Hybrid, so it drops out of Loweemon's host list.
  for (const [attacker, destination, source, memoryAfter, hosts] of [
    [DUSKMON, VELGRMON_CARD, "BT18-078", 2, [DUSKMON, LOWEEMON, DEMIDEVIMON]],
    [LOWEEMON, KAISERLEOMON_CARD, "BT18-076", 1, [LOWEEMON, DEMIDEVIMON]],
  ] as const) {
    await scenario.attack(attacker);
    await scenario.resolveUntil(
      (s) =>
        s.players[0]!.battleArea.find((p) => p.permanentId === attacker)!.topCard.instanceId === destination &&
        !s.pendingDecision &&
        !s.combatWindow &&
        s.phase === "Main",
      async (d) => {
        if (d.kind === "chooseTargets" && d.sourceCardId === source) {
          await expect(
            page.getByText(/^\[When Attacking\] 1 of your Digimon or Tamers may digivolve/).first(),
          ).toBeVisible();
          expect(d.options.candidateInstanceIds).toEqual(hosts);
          return { instanceId: attacker };
        }
        // Each host has exactly one legal named route, so a destination prompt must offer only it.
        if (d.kind === "selectCards" && d.sourceCardId === source) {
          expect(d.options.candidateInstanceIds).toEqual([destination]);
          return { instanceId: destination };
        }
        // Velgrmon's [End of Attack] deletion is optional; declining isolates the evolution cost.
        // Its prompt arrives in the same batch as the trash evolution (reveal, bonus draw: ~3.2 s)
        // and the security check (~2.4 s), which play back to back before it can show.
        if (d.kind === "optional" && d.sourceCardId === "BT18-079") return { accept: false, decisionBudgetMs: 8_000 };
        if (d.kind === "optional") return { accept: d.sourceCardId === source };
        return {};
      },
    );
    const state = await scenario.snapshot();
    const host = state.players[0]!.battleArea.find((p) => p.permanentId === attacker)!;
    expect(host.topCard.instanceId).toBe(destination);
    expect(host.stack.map((card) => card.cardId)).toContain(source);
    expect(state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(destination);
    expect(state.memory).toBe(memoryAfter);
  }
  const final = await scenario.snapshot();
  expect(final.players[0]!.trash.map((card) => card.instanceId)).toEqual([UKKOMON_CARD]);
  expect(final.players[1]!.securityCount).toBe(3);
  await scenario.healthy();
});

test("Discord 1557790296379625482: an ordinary host chooses between both trash Hybrids; Ukkomon is refused", async ({
  scenario,
  page,
}) => {
  test.setTimeout(120_000);
  await scenario.open("arena-discord-1557790296379625482-trash-hybrids");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack(DUSKMON);
  let offered = false;
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision && !s.combatWindow,
    async (d) => {
      if (d.kind === "chooseTargets" && d.sourceCardId === "BT18-078") {
        expect(d.options.candidateInstanceIds).not.toContain(UKKOMON);
        return { instanceId: DEMIDEVIMON };
      }
      if (d.kind === "selectCards" && d.sourceCardId === "BT18-078") {
        const dialog = page.getByRole("dialog");
        await expect(dialog.locator(`[data-instance-id="${VELGRMON_CARD}"]`)).toBeEnabled();
        await expect(dialog.locator(`[data-instance-id="${KAISERLEOMON_CARD}"]`)).toBeEnabled();
        await expect(dialog.locator(`[data-instance-id="${UKKOMON_CARD}"]`)).toBeDisabled();
        expect([...d.options.candidateInstanceIds!].sort()).toEqual([KAISERLEOMON_CARD, VELGRMON_CARD]);
        offered = true;
        return { instanceId: KAISERLEOMON_CARD };
      }
      if (d.kind === "optional") return { accept: d.sourceCardId === "BT18-078" };
      return {};
    },
  );
  expect(offered).toBe(true);
  const final = await scenario.snapshot();
  const host = final.players[0]!.battleArea.find((p) => p.permanentId === DEMIDEVIMON)!;
  expect(host.topCard.instanceId).toBe(KAISERLEOMON_CARD);
  expect(host.stack.map((card) => card.cardId)).toEqual(["BT2-067"]);
  expect(final.players[0]!.battleArea.find((p) => p.permanentId === UKKOMON)!.topCard.cardId).toBe("BT16-082");
  expect(final.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual([UKKOMON_CARD, VELGRMON_CARD]);
  // Ordinary purple Lv.3 route: 4, reduced by 1 by Duskmon.
  expect((await scenario.presentation()).events).toContainEqual(
    expect.objectContaining({ kind: "memoryChanged", from: 2, to: -1, reason: "digivolve" }),
  );
  await scenario.healthy();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Discord 1557790296379625482: the observed Loweemon host step is reachable on a phone and offers both Hybrids", async ({
    scenario,
    page,
  }) => {
    test.setTimeout(150_000);
    await scenario.open("arena-discord-1557790296379625482-loweemon-hosts");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await page.locator('[data-drop="perm-you"][data-id="perm-5"]').click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.getByRole("button", { name: /^Opponent security/ }).click();
    const isHostStep = (s: Awaited<ReturnType<typeof scenario.snapshot>>) =>
      s.pendingDecision?.kind === "chooseTargets" &&
      (s.pendingDecision.promptText ?? "").includes("Loweemon") &&
      !s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT18-077");
    await scenario.resolveUntil(isHostStep, (d) => {
      if (d.kind === "orderTriggers")
        return { triggerCardId: d.options.triggerCardIds?.includes("BT18-076") ? "BT18-076" : undefined };
      return { accept: d.sourceCardId === "BT18-076" };
    });
    const sheet = page.locator("[data-prompt-surface]").filter({ hasText: "[When Attacking]" });
    await expect(sheet).toContainText("Choose the card that will digivolve.");
    await sheet.getByRole("button", { name: "Select on board", exact: true }).click();
    await page.locator('[data-id="perm-1"][role="button"]').click();
    await page.getByRole("button", { name: /Return to decision/i }).click();
    await page.getByRole("button", { name: /^Confirm targets$/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.locator('[data-instance-id="s0-20"]')).toBeEnabled();
    await expect(dialog.locator('[data-instance-id="s0-12"]')).toBeEnabled();
    await expect(dialog.locator('[data-instance-id="observed-ukkomon"]')).toBeDisabled();
    await expect(dialog.getByRole("button", { name: /^Confirm targets$/i })).toBeInViewport();
    await scenario.resolveUntil(
      (s) => s.turnSeat === 1 && !s.pendingDecision && !s.combatWindow,
      (d) => {
        if (d.kind === "selectCards" && d.sourceCardId === "BT18-076") return { instanceId: "s0-12" };
        if (d.kind === "orderTriggers") return {};
        // Decline Ai & Mako and Koichi so the memory change shows only the evolution cost.
        return { accept: false };
      },
    );
    const final = await scenario.snapshot();
    const host = final.players[0]!.battleArea.find((p) => p.permanentId === "perm-1")!;
    expect(host.topCard.instanceId).toBe("s0-12");
    expect(final.players[0]!.trash.map((card) => card.instanceId)).not.toContain("s0-12");
    expect((await scenario.presentation()).events).toContainEqual(
      expect.objectContaining({ kind: "memoryChanged", from: 2, to: -2, reason: "digivolve" }),
    );
    await scenario.healthy();
  });
});
