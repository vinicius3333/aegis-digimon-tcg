import { useTranslation } from "../../i18n";
import { keywordReminder } from "../keywordReminders";
import { BadgeHint } from "./BadgeHint";
import type { PermanentKeywordEntry } from "./permanentKeywords";

/** How many keyword pills show before the rest collapse into a "+N" chip. */
const VISIBLE_KEYWORD_COUNT = 3;

/** The resolved keyword pills over the lower part of a permanent's art. */
export function PermanentKeywordBadges({
  keywords,
  securityAttackModifier,
}: {
  keywords: readonly PermanentKeywordEntry[];
  securityAttackModifier: number;
}) {
  const { t } = useTranslation();
  const visibleKeywords = keywords.slice(0, VISIBLE_KEYWORD_COUNT);
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
              .slice(VISIBLE_KEYWORD_COUNT)
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
