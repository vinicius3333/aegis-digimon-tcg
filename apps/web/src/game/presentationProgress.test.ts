import { describe, expect, it, vi } from "vitest";
import { createPresentationProgress } from "./presentationProgress";
import type { AnimationStep } from "./animationQueue";

/** A step that runs until it is let go, the way a step holding a moment on screen does. */
const step = (id: string): AnimationStep => ({ id, run: (context) => context.wait(1) });

/** Runs a tracked step the way the queue does, and returns the handle that ends it. */
function runTracked(tracked: AnimationStep): () => void {
  let finish = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  void tracked.run({ wait: () => done, cancelled: false, mode: "live" });
  return finish;
}

describe("createPresentationProgress", () => {
  it("reports nothing while no batch is being presented", () => {
    const progress = createPresentationProgress(vi.fn<() => void>());

    const loose = step("loose");
    expect(progress.current()).toBeUndefined();
    expect(progress.track(loose)).toBe(loose);
  });

  it("reports the revision of the oldest batch that still has a step to run", async () => {
    const onChange = vi.fn<() => void>();
    const progress = createPresentationProgress(onChange);

    progress.present("batch-1", 1);
    const first = runTracked(progress.track(step("first")));
    expect(progress.current()).toBe(1);
    expect(onChange).toHaveBeenCalled();

    // A later batch's cue can already be running; the board stays on the older moment.
    progress.present("batch-2", 2);
    const second = runTracked(progress.track(step("second")));
    expect(progress.current()).toBe(1);

    first();
    await vi.waitFor(() => expect(progress.current()).toBe(2));

    second();
    await vi.waitFor(() => expect(progress.current()).toBeUndefined());
  });

  it("reports nothing once it has settled, whatever became of the steps", () => {
    const progress = createPresentationProgress(vi.fn<() => void>());

    progress.present("batch-1", 1);
    progress.track(step("dropped-before-it-ran"));
    expect(progress.current()).toBe(1);

    progress.settle();
    expect(progress.current()).toBeUndefined();
  });

  it("never reports a revision older than the floor", () => {
    const progress = createPresentationProgress(vi.fn<() => void>());

    progress.present("batch-1", 1);
    runTracked(progress.track(step("first")));
    progress.raiseFloor(2);

    expect(progress.current()).toBeUndefined();
  });
});
