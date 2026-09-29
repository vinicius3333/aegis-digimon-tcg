/* A count against its target, such as 48/50 main deck cards, with a fill meter. */

import type { CSSProperties } from "react";
import { Icons } from "../design/icons";
import "./deckBuilder.css";

export function CountChip({
  label,
  count,
  target,
  done,
}: {
  label: string;
  count: number;
  target: number;
  done: boolean;
}) {
  const fill = `${Math.min(100, (count / target) * 100)}%`;
  return (
    <span className="deck-count" data-done={done}>
      <span className="deck-count__label">{label}</span>{" "}
      <span className="deck-count__value">
        {done ? <Icons.CircleCheck size={13} /> : null}
        {count}/{target}
      </span>
      <span className="deck-count__meter" aria-hidden="true">
        <span style={{ "--deck-count-fill": fill } as CSSProperties} />
      </span>
    </span>
  );
}
