import { Icons } from "../../design/icons";
import type { RestrictionBadge } from "../fieldBadges";
import { useTranslation } from "../../i18n";

/**
 * The standing debuff chips for the blanket restrictions an effect has imposed
 * on a permanent (server truth: `Permanent.cannotAttack` and friends). Spoken
 * through the wrapper's own state list, so the chips themselves stay out of the
 * accessibility tree rather than repeating it.
 */
export function PermanentRestrictionBadges({ restrictions }: { restrictions: readonly RestrictionBadge[] }) {
  const { t } = useTranslation();
  return (
    <div className="game-restriction-badges" aria-hidden="true">
      {restrictions.map((restriction) => (
        <span
          key={restriction.kind}
          className="game-restriction-badge"
          data-protection={restriction.protection || undefined}
          title={t(restriction.labelKey)}
        >
          <i aria-hidden="true">{restriction.protection ? <Icons.ShieldCheck size={12} /> : "⊘"}</i>
          {t(
            restriction.shortLabelKey ??
              (restriction.protection ? "game.digimonEffectProtectionBadge" : restriction.labelKey),
          )}
        </span>
      ))}
    </div>
  );
}
