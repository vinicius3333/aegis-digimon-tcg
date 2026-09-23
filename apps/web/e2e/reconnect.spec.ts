import { expect, test } from "./fixtures";
import { GamePage } from "./game-page";

type CardLike = { instanceId: string; cardId: string };
type PlayerLike = { hand?: CardLike[]; handCount?: number; trash?: CardLike[] };
type MatchSnapshot = {
  players: PlayerLike[];
  pendingDecision?: { decisionId: string; kind: string; seat: number };
  turnSeat: number;
  memory: number;
};

function statePlayer(state: MatchSnapshot, seat: number): PlayerLike {
  const player = state.players[seat];
  if (!player) throw new Error(`Expected player state for seat ${seat}`);
  return player;
}

test("reload resumes the same room and pending decision", async ({ page, match }) => {
  const game = new GamePage(page);
  await match.start("reconnect");

  await game.endBreeding();
  const beforePlay = (await match.snapshot()) as MatchSnapshot;
  const handBeforePlay = statePlayer(beforePlay, 0).hand ?? [];
  const trashBeforePlay = (statePlayer(beforePlay, 0).trash ?? []).map((card) => card.instanceId);
  await game.play(/yuuki/i);

  await expect.poll(() => match.state().pendingDecision?.seat).toBe(0);
  const decisionId = match.state().pendingDecision?.decisionId;
  expect(decisionId).toBeTruthy();
  const roomId = match.opponent.room.roomId;
  await expect
    .poll(async () => {
      const raw = await page.evaluate(() => sessionStorage.getItem("aegis:matchSession"));
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw);
        return parsed.roomId === roomId && typeof parsed.reconnectionToken === "string" ? parsed : undefined;
      } catch {
        return undefined;
      }
    })
    .toBeTruthy();
  await page.reload();

  // The same page keeps its sessionStorage token. A fresh GameScreen should resume before
  // it can show matchmaking, and the observer must still see the same server decision.
  await expect(page.getByTestId("hand")).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const raw = sessionStorage.getItem("aegis:matchSession");
        return raw ? (JSON.parse(raw).roomId as string) : undefined;
      }),
    )
    .toBe(roomId);
  await expect.poll(() => match.state().pendingDecision?.decisionId).toBe(decisionId);
  await expect(page.getByRole("dialog").or(page.getByTestId("board-prompt"))).toBeVisible();

  let paidInstanceId: string | undefined;
  let declinedReturnOptional = false;
  for (let round = 0; round < 10; round += 1) {
    const request = match.state().pendingDecision;
    if (match.state().turnSeat === 1 && request === undefined) break;
    if (!request) {
      await expect.poll(() => match.state().turnSeat === 1 || match.state().pendingDecision !== undefined).toBe(true);
      continue;
    }

    const surface = page.getByRole("dialog").or(page.getByTestId("board-prompt"));
    if (request.kind === "orderTriggers") {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { pressed: false }).first().click();
      await dialog.getByRole("button", { name: /resolve (?:next )?effect/i }).click();
    } else if (request.kind === "optional") {
      const prompt = await surface.innerText();
      if (/return 1 to hand/i.test(prompt)) {
        await surface.getByRole("button", { name: /no, decline|^don't use$/i }).click();
        declinedReturnOptional = true;
      } else {
        await surface.getByRole("button", { name: /yes, activate|^use$/i }).click();
      }
    } else if (request.kind === "selectCards" || request.kind === "chooseTargets") {
      const hand = page.getByTestId("hand");
      const candidates = hand.getByRole("button", { name: /^pick /i });
      const candidateCount = await candidates.count();
      expect(candidateCount).toBeGreaterThan(0);
      // Yuuki's mandatory cost chooses one card from hand. The chooser labels each
      // duplicate by copy position, matching the synchronized hand array order.
      const candidate = candidates.first();
      const renderedIndex = await candidate.evaluate((element) => {
        const handElement = element.closest<HTMLElement>("[data-testid=hand]");
        return Array.from(handElement?.querySelectorAll<HTMLElement>(".game-hand-card") ?? []).indexOf(
          element as HTMLElement,
        );
      });
      expect(renderedIndex).toBeGreaterThanOrEqual(0);
      const handAtDecision = (await match.snapshot()) as MatchSnapshot;
      const instance = statePlayer(handAtDecision, 0).hand?.[renderedIndex];
      expect(instance).toBeDefined();
      paidInstanceId = instance!.instanceId;
      await candidate.click();
      await surface.getByRole("button", { name: /confirm target|^end selection$/i }).click();
    } else {
      throw new Error(`Unexpected decision after reload: ${request.kind}`);
    }
    await expect.poll(() => match.state().pendingDecision?.decisionId).not.toBe(request.decisionId);
  }

  await expect.poll(() => match.state().turnSeat).toBe(1);
  const after = (await match.snapshot()) as MatchSnapshot;
  const protagonist = statePlayer(after, 0);
  const newlyTrashed = (protagonist.trash ?? []).filter((card) => !trashBeforePlay.includes(card.instanceId));
  expect(declinedReturnOptional).toBe(true);
  expect(newlyTrashed).toHaveLength(1);
  expect(newlyTrashed[0]?.instanceId).toBe(paidInstanceId);
  expect(protagonist.handCount ?? protagonist.hand?.length ?? 0).toBe(handBeforePlay.length - 2);
  expect(after.pendingDecision).toBeUndefined();
  expect(after.memory).toBe(3);
});
