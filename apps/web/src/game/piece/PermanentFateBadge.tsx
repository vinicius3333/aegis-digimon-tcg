import type { PendingFateBadge } from "../pendingFate";
import { useTranslation } from "../../i18n";

/** The badge a permanent wears while an effect is deciding its fate. */
export function PermanentFateBadge({ fate }: { fate: PendingFateBadge }) {
  const { t } = useTranslation();
  return (
    <span className={`game-fate-badge game-fate-badge--${fate.tone}`} data-fate={fate.fate} aria-hidden="true">
      <i aria-hidden="true">{fate.glyph}</i>
      {t(fate.labelKey)}
    </span>
  );
}
