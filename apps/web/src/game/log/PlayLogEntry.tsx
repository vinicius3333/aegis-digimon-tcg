import type { LogEntry } from "@/game/log/LogEntry";
import { CardLinkedText } from "@/game/cardLinks";
import { MemoryBadge } from "@/game/log/MemoryBadge";

type Props = { entry: LogEntry; highlight?: string; onOpenCard?: (cardId: string) => void };

export function PlayLogEntry({ entry, highlight, onOpenCard }: Props) {
  return (
    <div className="play-log__line" data-kind={entry.kind} data-effect={entry.effectRole}>
      <span className="play-log__marker" aria-hidden="true" />
      <p>
        <CardLinkedText text={entry.text} cardIds={entry.cardIds} highlight={highlight} onOpenCard={onOpenCard} />
        {entry.memory ? <MemoryBadge memory={entry.memory} /> : null}
      </p>
    </div>
  );
}
