import { CardFull } from "@/design/cards";

const MAX_THUMBNAILS = 4;
const THUMBNAIL_WIDTH = 34;

type Props = { cardIds: readonly string[] | undefined; onOpenCard?: (cardId: string) => void };

export function LogEntryCards({ cardIds, onOpenCard }: Props) {
  const shown = [...new Set(cardIds ?? [])].slice(0, MAX_THUMBNAILS);
  if (shown.length === 0) {
    return null;
  }
  return (
    <span className="play-log__cards">
      {shown.map((cardId) => (
        <CardFull
          key={cardId}
          cardId={cardId}
          width={THUMBNAIL_WIDTH}
          zoomOnHover={false}
          onClick={onOpenCard ? () => onOpenCard(cardId) : undefined}
        />
      ))}
    </span>
  );
}
