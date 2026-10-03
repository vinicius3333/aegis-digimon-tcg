import { getCardDefinition } from "@aegis/shared";
import { COLORS, colorKey } from "../../design/theme";
import { useTranslation } from "../../i18n";
import { BadgeHint } from "./BadgeHint";

/** Card edges drawn behind a group, at most this many however many copies it holds. */
const MAX_COPY_EDGES = 2;
export const COPY_EDGE_STEP = 5;

export function copyEdgeCount(copies: number): number {
  return Math.min(MAX_COPY_EDGES, Math.max(0, copies - 1));
}

/**
 * The copies a grouped Tamer or Option stands for, peeking out up and to the right.
 * The digivolution stack cascades down and to the left, so the two never read alike.
 */
export function PermanentCopyEdges({
  cardId,
  copies,
  width,
  suspended,
}: {
  cardId: string;
  copies: number;
  width: number;
  suspended: boolean;
}) {
  const color = COLORS[colorKey(getCardDefinition(cardId)?.colors[0])];
  return (
    <>
      {Array.from({ length: copyEdgeCount(copies) }, (_, step) => copyEdgeCount(copies) - step).map((index) => (
        <div
          key={index}
          className="game-copy-edge"
          aria-hidden="true"
          style={{
            left: index * COPY_EDGE_STEP,
            top: -index * COPY_EDGE_STEP,
            width,
            height: width * 1.4,
            background: color.soft,
            borderColor: `${color.edge}99`,
            rotate: suspended ? "90deg" : undefined,
          }}
        />
      ))}
    </>
  );
}

export function PermanentCopiesBadge({ copies }: { copies: number }) {
  const { t } = useTranslation();
  return (
    <BadgeHint
      className="game-copies-badge"
      aria-label={t("game.fieldCopies", { count: copies })}
      hint={{ title: t("game.fieldCopies", { count: copies }), description: t("game.fieldCopiesHint") }}
    >
      ×{copies}
    </BadgeHint>
  );
}
