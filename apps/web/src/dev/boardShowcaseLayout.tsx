/* The showcase's own frame: sections, labelled cases and the stage each case sits on. */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { TargetingSpotlight } from "../game/TargetingSpotlight";
import type { SpotlightSubject } from "../game/spotlight";

/**
 * The spotlight over real, laid-out cards. The mask's holes are measured from
 * the cards themselves, exactly as `GameScreen` measures them, so the showcase
 * proves the geometry rather than restating it as hard-coded boxes.
 */
export function SpotlightStage({ litIds, children }: { litIds: readonly string[]; children: ReactNode }) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [subjects, setSubjects] = useState<readonly SpotlightSubject[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    setSize({ width: boardRect.width, height: boardRect.height });
    setSubjects(
      litIds.flatMap((id) => {
        const element = board.querySelector<HTMLElement>(`[data-showcase-target="${id}"]`);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        return [
          {
            id,
            x: rect.left - boardRect.left,
            y: rect.top - boardRect.top,
            width: rect.width,
            height: rect.height,
            suspended: element.dataset.showcaseSuspended === "true",
          },
        ];
      }),
    );
  }, [litIds]);
  return (
    <div ref={boardRef} style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          gap: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
      <TargetingSpotlight subjects={subjects} width={size.width} height={size.height} />
    </div>
  );
}

export function Section({
  id,
  title,
  note,
  stacked,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  stacked?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="board-showcase__section" aria-label={title}>
      <h2 className="board-showcase__section-title">{title}</h2>
      {note ? <p className="board-showcase__section-note">{note}</p> : null}
      <div className={`board-showcase__row${stacked ? " board-showcase__row--stacked" : ""}`}>{children}</div>
    </section>
  );
}

export function Case({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="board-showcase__case">
      {children}
      <span className="board-showcase__case-label">{label}</span>
    </div>
  );
}

export function Stage({ label, height, children }: { label: string; height: number; children: ReactNode }) {
  return (
    <Case label={label}>
      <div className="board-showcase__stage" style={{ height }}>
        {children}
      </div>
    </Case>
  );
}
