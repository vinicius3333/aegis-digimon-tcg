// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnimationQueue } from "../../animationQueue";
import type { EffectActivation } from "../../effectSource";
import { enqueueEffectSources } from "./effectSources";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

function standaloneTrashSource() {
  const card = document.createElement("div");
  card.className = "game-pile__effect-card";
  card.dataset.activationKey = "1";
  document.body.append(card);
  let playState: AnimationPlayState = "running";
  const animation: Pick<CSSAnimation, "animationName" | "playState"> = {
    animationName: "battle-effect-trash-activation",
    get playState() {
      return playState;
    },
  };
  Object.defineProperty(card, "getAnimations", { value: () => [animation] });
  const queue = createAnimationQueue();
  let sources: readonly EffectActivation[] = [];
  enqueueEffectSources({
    fresh: [
      { kind: "effectActivated", seat: 0, sourceCardId: "ST1-02", effectKey: "standalone", description: "Activate." },
    ],
    usedOption: undefined,
    combatLeadInMs: 0,
    cardSiteRef: { current: { locate: () => ({ zone: "trash", instanceId: "buried" }) } },
    effectSourceKeyRef: { current: 0 },
    setEffectSources(update) {
      sources = typeof update === "function" ? update(sources) : update;
    },
    enqueue: queue.enqueue,
  });
  return {
    queue,
    complete() {
      playState = "finished";
    },
    get sources() {
      return sources;
    },
  };
}

describe("painted standalone trash ownership", () => {
  it("keeps the card after nominal queue time until its delayed CSS clock finishes", async () => {
    const cue = standaloneTrashSource();
    await vi.advanceTimersByTimeAsync(830);
    expect(cue.sources).toHaveLength(1);
    expect(cue.queue.isIdle()).toBe(false);
    cue.complete();
    await vi.advanceTimersByTimeAsync(16);
    expect(cue.sources).toHaveLength(0);
    expect(cue.queue.isIdle()).toBe(true);
  });
  it.each(["cancel", "skip", "drain"])("releases a still-running CSS clock on %s", async (action) => {
    const cue = standaloneTrashSource();
    await vi.advanceTimersByTimeAsync(830);
    if (action === "cancel") cue.queue.clear();
    else if (action === "skip") cue.queue.skip();
    else cue.queue.setMode("drain");
    await vi.advanceTimersByTimeAsync(16);
    expect(cue.sources).toHaveLength(0);
    expect(cue.queue.isIdle()).toBe(true);
  });
});
