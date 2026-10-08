/** Keep CSS transitions, keyframes and Web Animations on the queue's playback clock. */
export function createAnimationPlayback(animations: () => Animation[]) {
  const owned = new Map<Animation, { rate: number; pausedHere: boolean }>();
  return {
    apply(rate: number, paused: boolean) {
      const current = new Set(animations());
      for (const animation of owned.keys()) if (!current.has(animation)) owned.delete(animation);
      for (const animation of current) {
        let entry = owned.get(animation);
        if (!entry) {
          entry = { rate: animation.playbackRate, pausedHere: false };
          owned.set(animation, entry);
        }
        if (animation.playbackRate !== rate) animation.updatePlaybackRate(rate);
        if (paused && animation.playState === "running") {
          animation.pause();
          entry.pausedHere = true;
        } else if (!paused && entry.pausedHere) {
          entry.pausedHere = false;
          if (animation.playState === "paused") animation.play();
        }
      }
    },
    release() {
      for (const [animation, entry] of owned) {
        if (animation.playbackRate !== entry.rate) animation.updatePlaybackRate(entry.rate);
        if (entry.pausedHere && animation.playState === "paused") animation.play();
      }
      owned.clear();
    },
  };
}
