import { test, expect } from "./fixtures";
import { GamePage } from "./game-page";

test("dragging Silphymon onto the field DNA digivolves both exact materials for zero memory", async ({
  page,
  match,
}) => {
  await match.start("dna");
  const game = new GamePage(page);

  await game.endBreeding();
  await game.play(/^kokatorimon$/i);
  await expect.poll(() => match.state().players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-014")).toBe(true);
  const red = match.state().players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-014")!;
  const redId = red.topCard.instanceId;
  const redPermanentId = red.permanentId;

  await game.endBreeding();
  await game.play(/^reppamon$/i);
  await expect.poll(() => match.state().players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-051")).toBe(true);
  const yellow = match.state().players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-051")!;
  const yellowId = yellow.topCard.instanceId;
  const yellowPermanentId = yellow.permanentId;
  const handBefore = match.state().players[0]!.handCount;
  expect(match.state().memory).toBe(0);

  const browserState = await match.snapshot();
  const silphymonId = browserState.players[0]!.hand.find((card) => card.cardId === "BT16-012")!.instanceId;
  await game.dragCardTo(/^silphymon$/i, page.locator('[data-drop="battle-you"]'));
  await expect(page.getByText(/DNA Digivolution available/i)).toBeVisible();
  await page.getByRole("button", { name: /^DNA Digivolve$/i }).click();

  await expect.poll(() => match.state().players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT16-012"]);
  const player = match.state().players[0]!;
  const result = player.battleArea[0]!;
  expect(result.topCard.instanceId).toBe(silphymonId);
  // CR 8-2-2-2: printed Red + Yellow places Red above Yellow; stack is bottom-first.
  expect([...result.stack].map((card) => card.instanceId)).toEqual([yellowId, redId]);
  expect(player.battleArea.some((p) => p.permanentId === redPermanentId || p.permanentId === yellowPermanentId)).toBe(
    false,
  );
  expect([...player.trash].map((card) => card.instanceId)).not.toContain(redId);
  expect([...player.trash].map((card) => card.instanceId)).not.toContain(yellowId);
  expect(player.handCount).toBe(handBefore);
  expect(match.state().memory).toBe(0);
  await expect
    .poll(async () => (await match.snapshot()).players[0]!.hand.some((card) => card.instanceId === silphymonId))
    .toBe(false);

  const resultCard = page
    .locator('[data-drop="perm-you"]')
    .filter({ has: page.getByRole("img", { name: /^silphymon$/i }) });
  await expect(resultCard).toContainText("×2");
  await resultCard.click();
  await expect(page.getByRole("button", { name: /^open kokatorimon$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^open reppamon$/i })).toBeVisible();
});
