// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import type { AnimationStepContext } from "../../animationQueue";
import { waitForDeckRiffleClock } from "./deckRiffleClock";

afterEach(() => document.body.replaceChildren());
function fixture(duration = 180, scale = 1) {
  document.body.innerHTML =
    '<main class="aegis-arena" data-viewer-seat="1"><div class="game-utility-slot--you-deck"><div class="game-pile--riffling" data-deck-riffle-key="1"></div></div><div class="game-utility-slot--opp-eggs"><div class="game-pile--riffling" data-deck-riffle-key="1"></div></div></main>';
  let age = duration - 40 * scale;
  const pile = document.querySelector<HTMLElement>(".game-utility-slot--you-deck .game-pile--riffling")!;
  const other = document.querySelector<HTMLElement>(".game-utility-slot--opp-eggs .game-pile--riffling")!;
  const animation = {
    animationName: "battle-deck-riffle",
    playState: "running",
    get currentTime() {
      return Math.min(duration, age);
    },
    effect: { getTiming: () => ({ delay: 0 }), getComputedTiming: () => ({ duration }) },
  } as unknown as Animation;
  pile.getAnimations = vi.fn<() => Animation[]>(() => [animation]);
  other.getAnimations = vi.fn<() => Animation[]>(() => []);
  const context: AnimationStepContext = {
    mode: "live",
    cancelled: false,
    skipping: false,
    wait: vi.fn<AnimationStepContext["wait"]>(async (ms) => {
      age += ms * scale;
    }),
  };
  return { context, other };
}
const riffle = { seat: 1, pile: "deck", key: 1 } as const;
it.each([
  [180, 1],
  [99, 0.55],
])("keeps the late painted %sms shuffle through its completed frame", async (duration, scale) => {
  const { context, other } = fixture(duration, scale);
  await waitForDeckRiffleClock(riffle, context);
  expect(context.wait).toHaveBeenCalledTimes(4);
  expect(other.getAnimations).not.toHaveBeenCalled();
});
it("does not borrow a different seat's egg-pile clock", async () => {
  const { context } = fixture();
  await waitForDeckRiffleClock({ ...riffle, seat: 0, pile: "eggDeck" }, context);
  expect(context.wait).not.toHaveBeenCalled();
});
it("does not borrow an older shuffle's painted clock", async () => {
  const { context } = fixture();
  await waitForDeckRiffleClock({ ...riffle, key: 2 }, context);
  expect(context.wait).not.toHaveBeenCalled();
});
it.each(["drain", "replay"] as const)("does not retain decorative shuffle in %s", async (mode) => {
  const { context } = fixture();
  await waitForDeckRiffleClock(riffle, { ...context, mode });
  expect(context.wait).not.toHaveBeenCalled();
});
it("releases a cancelled painted clock after its pending wait", async () => {
  const { context } = fixture();
  let cancelled = false;
  const wait = vi.fn<AnimationStepContext["wait"]>(async () => {
    cancelled = true;
  });
  await waitForDeckRiffleClock(riffle, {
    ...context,
    wait,
    get cancelled() {
      return cancelled;
    },
  });
  expect(wait).toHaveBeenCalledOnce();
});
it("bounds a frozen decorative clock", async () => {
  const { context } = fixture();
  const wait = vi.fn<AnimationStepContext["wait"]>(async () => {});
  await waitForDeckRiffleClock(riffle, { ...context, wait });
  expect(wait).toHaveBeenCalledTimes(12);
});
