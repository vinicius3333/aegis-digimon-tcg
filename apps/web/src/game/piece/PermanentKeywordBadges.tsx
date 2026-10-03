import { useTranslation } from "../../i18n";
import { keywordReminder } from "../keywordReminders";
import { BadgeHint } from "./BadgeHint";
import type { PermanentKeywordEntry } from "./permanentKeywords";

/** Never more pills than this, however wide the card is. */
const MAX_VISIBLE_KEYWORD_COUNT = 3;
/** The pill line starts after the digivolution count and reaches past the card's right edge (fieldBadges.css). */
const LINE_START_PX = 22;
const LINE_OVERHANG_PX = 12;
/** The pills use a 9px monospace font: every character is 0.6em wide. */
const CHARACTER_WIDTH_PX = 5.4;
const PILL_PADDING_PX = 8;
const PILL_GAP_PX = 2;
const MORE_CHIP_WIDTH_PX = 22;

const pillWidth = (label: string) => label.length * CHARACTER_WIDTH_PX + PILL_PADDING_PX;

/**
 * How many pills fit on the single line above a card of `cardWidth`, leaving room for the
 * "+N" chip when some are left out. If no complete label fits, show only the count
 * with every keyword in its explanation rather than a truncated fragment.
 */
export function visibleKeywordCount(labels: readonly string[], cardWidth: number): number {
  const available = cardWidth - LINE_START_PX + LINE_OVERHANG_PX;
  let used = 0;
  let count = 0;
  for (const label of labels.slice(0, MAX_VISIBLE_KEYWORD_COUNT)) {
    const next = used + (count > 0 ? PILL_GAP_PX : 0) + pillWidth(label);
    const needsMoreChip = count + 1 < labels.length;
    if (next + (needsMoreChip ? PILL_GAP_PX + MORE_CHIP_WIDTH_PX : 0) > available) break;
    used = next;
    count += 1;
  }
  return count;
}

/** The resolved keyword pills on one line just above a permanent's card. */
export function PermanentKeywordBadges({
  keywords,
  securityAttackModifier,
  cardWidth,
}: {
  keywords: readonly PermanentKeywordEntry[];
  securityAttackModifier: number;
  cardWidth: number;
}) {
  const { t } = useTranslation();
  const shownCount = visibleKeywordCount(
    keywords.map((entry) => entry.label),
    cardWidth,
  );
  const visibleKeywords = keywords.slice(0, shownCount);
  const hiddenKeywordCount = keywords.length - visibleKeywords.length;
  return (
    <div
      className="game-keyword-badges"
      aria-label={`Active keywords: ${keywords.map((entry) => entry.label).join(", ")}`}
    >
      {visibleKeywords.map(({ keyword, label }) => (
        <BadgeHint
          key={keyword}
          className="game-keyword-badge"
          hint={{ title: `<${label}>`, description: keywordReminder(keyword, t, securityAttackModifier) }}
        >
          {label}
        </BadgeHint>
      ))}
      {hiddenKeywordCount > 0 ? (
        <BadgeHint
          className="game-keyword-badge game-keyword-badge--more"
          aria-label={`${hiddenKeywordCount} more keywords`}
          hint={{
            title: keywords
              .slice(shownCount)
              .map((entry) => entry.label)
              .join(" · "),
            description: t("redesign.arena.badge.keywordsMore", { count: hiddenKeywordCount }),
          }}
        >
          +{hiddenKeywordCount}
        </BadgeHint>
      ) : null}
    </div>
  );
}
