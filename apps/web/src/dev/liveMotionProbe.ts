/** Browser observations, independent of the queue's intended timings.
 * Sources and interpretation: ./LIVE_MOTION.md. Opt-in, development only. */
export interface MotionSample {
  id: number;
  name: string;
  target: string;
  firstAt: number;
  lastAt: number;
  durationMs: number | null;
  infinite: boolean;
  visibleFrames: number;
  movingFrames: number;
  advancingFrames: number;
  pausedFrames: number;
  ended: boolean;
  cutShort: boolean;
  /** True when frame gaps prevent a reliable motion or unmount judgment. */
  undersampled: boolean;
}

export interface VisibleMoment {
  id: string;
  kind: "toast" | "deletion";
  firstAt: number;
  lastAt: number;
  ended: boolean;
  duringDecision: boolean;
}

export function createLiveMotionProbe(doc: Document = document) {
  const win = doc.defaultView!;
  let running = false;
  let frame = 0;
  let previousFrame: number | undefined;
  let sequence = 0;
  let hiddenMs = 0;
  let hiddenAt: number | undefined;
  let dropped = 0;
  const samples: MotionSample[] = [];
  const moments: VisibleMoment[] = [];
  const gaps: number[] = [];
  let seen = new WeakMap<Animation, MotionSample>();
  const active = new Map<Animation, { sample: MotionSample; time: number | null; visual: string }>();
  const visible = new Map<Element, VisibleMoment>();
  const limit = 600;

  function capped<T>(list: T[], value: T) {
    list.push(value);
    if (list.length > limit) {
      list.shift();
      dropped += 1;
    }
  }

  function visibilityChanged() {
    const now = win.performance.now();
    if (doc.visibilityState === "hidden") hiddenAt ??= now;
    else if (hiddenAt !== undefined) {
      hiddenMs += now - hiddenAt;
      hiddenAt = undefined;
    }
    // rAF can stop before a single hidden callback runs.
    previousFrame = undefined;
    for (const { sample } of active.values()) sample.undersampled = true;
  }

  function tick(now: number) {
    if (!running) return;
    if (doc.visibilityState === "hidden") {
      hiddenAt ??= now;
      previousFrame = undefined;
      frame = win.requestAnimationFrame(tick);
      return;
    }
    if (hiddenAt !== undefined) {
      hiddenMs += now - hiddenAt;
      hiddenAt = undefined;
    }
    if (previousFrame !== undefined) capped(gaps, now - previousFrame);
    previousFrame = now;
    const visibility = new Map<Element, boolean>();
    function painted(element: Element): boolean {
      const cached = visibility.get(element);
      if (cached !== undefined) return cached;
      const box = element.getBoundingClientRect();
      const style = win.getComputedStyle(element);
      const result =
        element.isConnected &&
        box.width > 0 &&
        box.height > 0 &&
        box.bottom > 0 &&
        box.right > 0 &&
        box.top < win.innerHeight &&
        box.left < win.innerWidth &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        (!element.parentElement || painted(element.parentElement));
      visibility.set(element, result);
      return result;
    }
    const animations = new Set(typeof doc.getAnimations === "function" ? doc.getAnimations() : []);
    for (const animation of animations) {
      const effect = animation.effect as KeyframeEffect | null;
      const target = effect?.target;
      if (!(target instanceof win.Element)) continue;
      const time = typeof animation.currentTime === "number" ? animation.currentTime : null;
      const isVisible = painted(target);
      let sample = seen.get(animation);
      if (!sample) {
        const timing = effect!.getComputedTiming();
        sample = {
          id: ++sequence,
          name:
            (animation as CSSAnimation).animationName ??
            (animation as CSSTransition).transitionProperty ??
            "Web Animation",
          target: `${target.tagName.toLowerCase()}.${[...target.classList].join(".")}${effect?.pseudoElement ?? ""}`,
          firstAt: now,
          lastAt: now,
          durationMs:
            typeof timing.activeDuration === "number" && Number.isFinite(timing.activeDuration)
              ? timing.activeDuration
              : null,
          infinite: timing.iterations === Infinity,
          visibleFrames: 0,
          movingFrames: 0,
          advancingFrames: 0,
          pausedFrames: 0,
          ended: false,
          cutShort: false,
          undersampled: false,
        };
        seen.set(animation, sample);
        capped(samples, sample);
      }
      const style = win.getComputedStyle(target, effect?.pseudoElement);
      const box = target.getBoundingClientRect();
      const visual = [
        style.opacity,
        style.transform,
        style.translate,
        style.rotate,
        style.scale,
        style.filter,
        style.clipPath,
        style.boxShadow,
        style.strokeDashoffset,
        box.x.toFixed(1),
        box.y.toFixed(1),
        box.width.toFixed(1),
        box.height.toFixed(1),
      ].join("|");
      const earlier = active.get(animation);
      sample.undersampled ||= !!earlier && now - sample.lastAt > 50;
      sample.lastAt = now;
      if (isVisible) {
        sample.visibleFrames += 1;
        if (earlier && earlier.visual !== visual) sample.movingFrames += 1;
        if (earlier && time !== null && time !== earlier.time) sample.advancingFrames += 1;
      }
      if (animation.playState === "paused") sample.pausedFrames += 1;
      sample.ended = animation.playState === "finished";
      active.set(animation, { sample, time, visual });
    }
    for (const [animation, entry] of active) {
      if (animations.has(animation)) continue;
      entry.sample.ended = true;
      const end = animation.effect?.getComputedTiming().endTime;
      // Allow two 60 Hz frames at unmount. Delayed shards must finish too.
      entry.sample.undersampled ||= now - entry.sample.lastAt > 50;
      entry.sample.cutShort =
        !entry.sample.undersampled &&
        !entry.sample.infinite &&
        typeof end === "number" &&
        entry.time !== null &&
        end - entry.time > 34 * Math.max(1, Math.abs(animation.playbackRate));
      active.delete(animation);
    }
    const elements = new Set(doc.querySelectorAll("[data-narration-id], .narration-peek, .game-delete-burst"));
    for (const element of elements) {
      if (!painted(element)) continue;
      let moment = visible.get(element);
      if (!moment) {
        moment = {
          id: element.getAttribute("data-narration-id") ?? `visual-${++sequence}`,
          kind: element.matches(".game-delete-burst") ? "deletion" : "toast",
          firstAt: now,
          lastAt: now,
          ended: false,
          duringDecision: false,
        };
        visible.set(element, moment);
        capped(moments, moment);
      }
      moment.lastAt = now;
      moment.duringDecision ||= !!doc.querySelector('[role="dialog"], [data-testid="decision-board-prompt"]');
    }
    for (const [element, moment] of visible) {
      if (elements.has(element) && painted(element)) continue;
      moment.ended = true;
      visible.delete(element);
    }
    frame = win.requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      previousFrame = undefined;
      doc.addEventListener("visibilitychange", visibilityChanged);
      if (doc.visibilityState === "hidden") hiddenAt = win.performance.now();
      frame = win.requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      win.cancelAnimationFrame(frame);
      doc.removeEventListener("visibilitychange", visibilityChanged);
      if (hiddenAt !== undefined) {
        hiddenMs += win.performance.now() - hiddenAt;
        hiddenAt = undefined;
      }
    },
    reset() {
      samples.length = moments.length = gaps.length = 0;
      active.clear();
      visible.clear();
      seen = new WeakMap();
      sequence = hiddenMs = dropped = 0;
      previousFrame = undefined;
      hiddenAt = running && doc.visibilityState === "hidden" ? win.performance.now() : undefined;
    },
    read() {
      const sorted = [...gaps].sort((a, b) => a - b);
      const p95Ms = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      return {
        running,
        supported: typeof doc.getAnimations === "function",
        reducedMotion: win.matchMedia("(prefers-reduced-motion: reduce)").matches,
        hiddenMs,
        dropped,
        captureQuality: gaps.length < 2 ? "insufficient" : p95Ms > 50 ? "undersampled" : "usable",
        frames: {
          sampled: gaps.length,
          p95Ms,
          maxMs: sorted.at(-1) ?? 0,
          over50Ms: gaps.filter((gap) => gap > 50).length,
        },
        animations: samples.map((sample) => ({ ...sample })),
        moments: moments.map((moment) => ({ ...moment })),
      };
    },
  };
}

export type LiveMotionProbe = ReturnType<typeof createLiveMotionProbe>;
