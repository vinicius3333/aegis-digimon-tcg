/* CSS keyframes, CSS transitions and Web Animations run on the browser's clock, not on the
   animation queue's `ctx.wait`, so the queue's rate and pause do not reach them. This
   applies the same rate and pause to every animation in the document.

   Caveats:
   - An animation created after a call runs at normal speed until the next call, so the
     lab calls this every frame while the rate is not 1 or playback is paused.
   - Only animations this helper paused are played again; one the app paused itself is left
     alone.
   - `requestAnimationFrame` loops and plain `setTimeout`s outside the queue (narration
     expiry, decision budgets, gate ceilings) keep real time. The match screen has no Pixi
     ticker to scale. */

export interface DocumentPlayback {
  apply(rate: number, paused: boolean): void;
}

export function createDocumentPlayback(): DocumentPlayback {
  const pausedHere = new WeakSet<Animation>();
  return {
    apply(rate, paused) {
      if (typeof document === "undefined" || typeof document.getAnimations !== "function") return;
      for (const animation of document.getAnimations()) {
        if (animation.playbackRate !== rate) animation.updatePlaybackRate(rate);
        if (paused && animation.playState === "running") {
          animation.pause();
          pausedHere.add(animation);
        } else if (!paused && pausedHere.has(animation)) {
          pausedHere.delete(animation);
          if (animation.playState === "paused") animation.play();
        }
      }
    },
  };
}
