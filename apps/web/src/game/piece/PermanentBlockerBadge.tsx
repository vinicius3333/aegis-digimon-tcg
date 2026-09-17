import { useTranslation } from "../../i18n";

/**
 * ＜Blocker＞ is the one keyword the board answers a question about every turn
 * ("can that thing stop my attack?"), so it gets a shield of its own on a corner
 * rather than a slot in the keyword strip.
 */
export function PermanentBlockerBadge() {
  const { t } = useTranslation();
  return (
    <span className="game-blocker-badge" aria-label={t("game.blockerBadge")}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 2.6 20 6v6.2c0 4.6-3.2 8-8 9.2-4.8-1.2-8-4.6-8-9.2V6z" />
      </svg>
    </span>
  );
}
