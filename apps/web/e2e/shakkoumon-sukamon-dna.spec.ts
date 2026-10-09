import { test, expect } from "./scenario-page";
import { GamePage } from "./game-page";

const permanentIds: Record<string, string> = {
  "EX13-028": "dev-perm-0-shakkoumon-ex13",
  "BT11-040": "dev-perm-0-shakkoumon-bt11",
  "EX5-046": "dev-perm-0-shakkoumon-targetmon",
};

// BT23-032 [DNA Digivolve] Yellow Lv.4 + black/blue Lv.4: Cost 0. EX13-028 is yellow only,
// BT11-040 and EX5-046 are yellow/black, so every pair fills both slots. Selections are
// clicked in reverse printed order: the server route decides the stack order.
for (const [first, second] of [
  ["BT11-040", "EX13-028"],
  ["EX5-046", "EX13-028"],
  ["EX5-046", "BT11-040"],
] as const) {
  test(`Discord 1557575147119054889: Shakkoumon DNA digivolves from ${first} + ${second} for 0`, async ({
    scenario,
    page,
  }) => {
    await scenario.open("arena-discord-1557575147119054889-shakkoumon-sukamon");
    await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
    const initial = await scenario.snapshot();
    const you = initial.players[0]!;
    const shakkoumon = you.hand.find((c) => c.cardId === "BT23-032")!;
    const routePairs = new Set(
      shakkoumon.dnaDigivolveRoutes.map((route) => {
        expect(route.projectedCost).toBe(0);
        return (JSON.parse(route.materialPermanentIdsJson) as string[]).sort().join("+");
      }),
    );
    expect([...routePairs].sort()).toEqual(
      [
        ["EX13-028", "BT11-040"],
        ["EX13-028", "EX5-046"],
        ["BT11-040", "EX5-046"],
      ]
        .map((pair) =>
          pair
            .map((id) => permanentIds[id]!)
            .sort()
            .join("+"),
        )
        .sort(),
    );
    expect(initial.memory).toBe(0);

    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await new GamePage(page).dragCardTo(/^Shakkoumon$/i, page.locator('[data-drop="battle-you"]'));
    const dna = page.getByRole("region", { name: /DNA Digivolution available/i });
    await expect(dna).toBeVisible();
    await expect(dna.getByRole("button", { name: "DNA Digivolve", exact: true })).toBeDisabled();
    for (const cardId of [first, second])
      await page.locator(`[data-drop="perm-you"][data-id="${permanentIds[cardId]}"]`).click();
    await expect(dna.getByRole("status").filter({ hasText: "Cost: 0" })).toBeVisible();
    await dna.getByRole("button", { name: "DNA Digivolve", exact: true }).click();
    await scenario.resolveUntil(
      (s) =>
        s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT23-032") && !s.pendingDecision && !s.combatWindow,
    );

    const final = await scenario.snapshot();
    const player = final.players[0]!;
    const result = player.battleArea.find((p) => p.topCard.cardId === "BT23-032")!;
    expect(result.topCard.instanceId).toBe(shakkoumon.instanceId);
    expect(result.isSuspended).toBe(false);
    const stack = result.stack.map((c) => c.cardId);
    // CR 8-2-2-2: the left-hand Yellow slot goes on top. Only EX13-028 is yellow-only, so it
    // must be the top material; the two yellow/black cards may fill either slot.
    if (second === "EX13-028") expect(stack).toEqual([first, "EX13-028"]);
    else expect(stack.sort()).toEqual([first, second].sort());
    const untouched = Object.keys(permanentIds).find((id) => id !== first && id !== second)!;
    expect(player.battleArea.map((p) => p.permanentId).sort()).toEqual(
      [result.permanentId, permanentIds[untouched]!].sort(),
    );
    expect(final.memory).toBe(0);
    // Shakkoumon left the hand and the DNA bonus drew one card.
    expect(player.handCount).toBe(you.handCount);
    expect(player.hand.some((c) => c.instanceId === shakkoumon.instanceId)).toBe(false);
    expect(player.trash.map((c) => c.cardId)).not.toContain(first);
    expect(player.trash.map((c) => c.cardId)).not.toContain(second);
    await scenario.healthy();
  });
}

test("Discord 1557575147119054889: Shakkoumon DNA is refused with two yellow-only Sukamon", async ({
  scenario,
  page,
}) => {
  await scenario.open("arena-discord-1557575147119054889-shakkoumon-yellow-only");
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  const initial = await scenario.snapshot();
  const you = initial.players[0]!;
  expect(you.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX13-028", "EX13-028"]);
  // No black or blue Lv.4 can fill the second slot.
  expect(you.hand.find((c) => c.cardId === "BT23-032")!.dnaDigivolveRoutes).toHaveLength(0);

  // Without a DNA route, dropping Shakkoumon on the field is an ordinary play for its
  // printed cost of 8, not a DNA prompt.
  await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  await new GamePage(page).dragCardTo(/^Shakkoumon$/i, page.locator('[data-drop="battle-you"]'));
  await expect(page.getByRole("region", { name: /DNA Digivolution available/i })).toHaveCount(0);
  await scenario.resolveUntil((s) => s.turnSeat === 1 && !s.pendingDecision);
  const final = await scenario.snapshot();
  const player = final.players[0]!;
  const played = player.battleArea.find((p) => p.topCard.cardId === "BT23-032")!;
  expect(played.stack).toHaveLength(0);
  expect(player.battleArea.filter((p) => p.topCard.cardId === "EX13-028")).toHaveLength(2);
  expect(
    (await scenario.presentation()).events.filter((e) => e.kind === "digivolved" && e.cardId === "BT23-032"),
  ).toHaveLength(0);
  // Paying 8 from 0 passes the turn with 8 memory on the opponent's side.
  expect(final.memory).toBe(8);
  await scenario.healthy();
});
