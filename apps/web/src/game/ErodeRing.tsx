/**
 * The clock a player can see on a timed panel: a border that erodes clockwise over
 * `remainingMs`. Each half of the ring is drained by a turning cover rather than an
 * animated `conic-gradient`, so the sweep runs on the compositor instead of
 * repainting the panel on every frame.
 */
export function ErodeRing({ className, remainingMs }: { className: string; remainingMs: number }) {
  return (
    <span className={`erode-ring ${className}`} style={{ animationDuration: `${remainingMs}ms` }} aria-hidden="true">
      <span className="erode-ring__half erode-ring__half--left" />
      <span className="erode-ring__half erode-ring__half--right" />
    </span>
  );
}
