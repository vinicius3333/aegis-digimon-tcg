import { useLayoutEffect, useRef } from "react";

/** The three gashes move as one shape inside the card's clipping boundary. */
const CLAW_TINE_INDEXES = [0, 1, 2];

/**
 * A diagonal impact on the card that lost its battle. The existing Aegis paths
 * and colours travel together for 250 ms, then remain visible through the
 * impact owner's settle, ahead of its removal.
 */
export function ClawSlash({ fixedFieldAnchor = false }: { fixedFieldAnchor?: boolean }) {
  const mask = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = mask.current;
    const field = element?.closest<HTMLElement>("[data-field-key]");
    if (!fixedFieldAnchor || !element || !field) return;
    // The reference mask is copied onto the canvas at impact. Cancel only the
    // existing row's planar FLIP, using its own clock, so the mask stays there
    // while the held artwork settles into its slot.
    const anchor = element.getBoundingClientRect();
    let counter: Animation | undefined;
    let tracked: Animation | undefined;
    let waiting: Animation | undefined;
    let active = true;
    let frame = 0;
    function sync() {
      const flight = field!.getAnimations?.().find((animation) => {
        const frames = animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [];
        return (
          animation.constructor.name === "Animation" &&
          frames.length === 2 &&
          frames.every((pose) => typeof pose.translate === "string" && pose.rotate === "0deg") &&
          animation.effect?.getTiming().duration === 420
        );
      });
      // A newly installed WAAPI flight can still have a pending startTime.
      // Rebind once the browser assigns it, even though its identity is unchanged.
      if (flight !== tracked || (flight && !counter && typeof flight.startTime === "number")) {
        counter?.cancel();
        counter = undefined;
        element!.style.translate = "none";
        const bounds = element!.getBoundingClientRect();
        const offsetX = anchor.x - bounds.x,
          offsetY = anchor.y - bounds.y;
        if (flight?.effect instanceof KeyframeEffect && typeof flight.startTime === "number") {
          const frames = flight.effect.getKeyframes();
          const start = String(frames[0]!.translate).split(" ").map(Number.parseFloat);
          const current = getComputedStyle(field!).translate.split(" ").map(Number.parseFloat);
          const x = (current[0] || 0) + offsetX,
            y = (current[1] || 0) + offsetY;
          counter = element!.animate(
            [{ translate: `${x - (start[0] || 0)}px ${y - (start[1] || 0)}px` }, { translate: `${x}px ${y}px` }],
            flight.effect.getTiming(),
          );
          counter.playbackRate = flight.playbackRate;
          counter.startTime = flight.startTime;
        } else element!.style.translate = `${offsetX}px ${offsetY}px`;
        tracked = flight;
      }
      if (flight && typeof flight.startTime !== "number" && waiting !== flight) {
        waiting = flight;
        // Bind before the first moving paint, once the pending flight receives
        // its timeline origin. The frame loop also handles later replacements.
        void flight.ready.then(
          () => {
            if (active && tracked === flight) sync();
          },
          () => {},
        );
      }
      if (counter && flight && typeof flight.startTime === "number") {
        if (counter.playbackRate !== flight.playbackRate) counter.playbackRate = flight.playbackRate;
        if (counter.startTime !== flight.startTime) counter.startTime = flight.startTime;
      }
    }
    function freeze() {
      sync();
      frame = requestAnimationFrame(freeze);
    }
    // A child's layout effect precedes the row's. Read after the parent has
    // installed its flight, and rebind if another layout flight replaces it.
    frame = requestAnimationFrame(freeze);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      counter?.cancel();
    };
  }, [fixedFieldAnchor]);
  return (
    <span ref={mask} className="game-claw" aria-hidden="true">
      <svg viewBox="0 0 100 140" preserveAspectRatio="none" focusable="false">
        {CLAW_TINE_INDEXES.map((index) => (
          <path
            key={index}
            className="game-claw__tine"
            d={`M ${-14 + index * 22} ${-6 + index * 4} C ${26 + index * 20} ${34 + index * 6}, ${52 + index * 18} ${72 + index * 6}, ${104 + index * 12} ${138 + index * 4}`}
          />
        ))}
      </svg>
    </span>
  );
}
