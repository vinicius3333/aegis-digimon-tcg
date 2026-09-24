import type { PointerEvent } from "react";
import { Icons } from "../../design/icons";
import type { RestrictionBadge } from "../fieldBadges";
import { useTranslation } from "../../i18n";
import { formatDpDelta } from "./formatDpDelta";

function BadgeIcon({ restriction }: { restriction: RestrictionBadge }) {
  if (restriction.action) return <Icons.Swords size={12} />;
  if (restriction.protection) return <Icons.ShieldCheck size={12} />;
  if (restriction.icon === "digimon") return <Icons.DigimonEffect size={12} />;
  if (restriction.icon === "option") return <Icons.OptionEffect size={12} />;
  if (restriction.icon === "tamer") return <Icons.TamerEffect size={12} />;
  if (restriction.icon === "allEffects") return <Icons.ShieldCheck size={12} />;
  if (restriction.icon === "attackOff") return <Icons.AttackOff size={12} />;
  if (restriction.icon === "blockOff") return <Icons.BlockOff size={12} />;
  if (restriction.icon === "suspendOff") return <Icons.SuspendOff size={12} />;
  if (restriction.icon === "unsuspendOff") return <Icons.UnsuspendOff size={12} />;
  if (restriction.icon === "effectOff") return <Icons.EffectOff size={12} />;
  if (restriction.icon === "dpShield") return <Icons.DpShield size={12} />;
  if (restriction.icon === "deDigivolveShield") return <Icons.DeDigivolveShield size={12} />;
  if (restriction.icon === "deleteShield") return <Icons.DeleteShield size={12} />;
  if (restriction.icon === "returnShield") return <Icons.ReturnShield size={12} />;
  return <Icons.Ban size={12} />;
}

const viewportEdgeMargin = 8;

/** Opens the tooltip on the left when the right side would run past the viewport edge. */
function placeTooltip(event: PointerEvent<HTMLDivElement>) {
  const badge = (event.target as HTMLElement).closest<HTMLElement>(".game-restriction-badge");
  const tooltip = badge?.querySelector<HTMLElement>(".game-restriction-tooltip");
  if (!badge || !tooltip) return;
  const badgeRight = badge.getBoundingClientRect().right;
  const fitsRight =
    badgeRight + tooltip.offsetWidth + viewportEdgeMargin <= document.documentElement.clientWidth;
  badge.dataset.tooltipSide = fitsRight ? "right" : "left";
}

/**
 * The standing debuff chips for the blanket restrictions an effect has imposed
 * on a permanent (server truth: `Permanent.cannotAttack` and friends). Spoken
 * through the wrapper's own state list, so the chips themselves stay out of the
 * accessibility tree rather than repeating it.
 */
export function PermanentRestrictionBadges({
  restrictions,
  dpDelta,
}: {
  restrictions: readonly RestrictionBadge[];
  dpDelta?: number;
}) {
  const { t } = useTranslation();
  const maxVisibleBadges = 3;
  const visibleRestrictions = restrictions.slice(0, maxVisibleBadges);
  const showDpBadge = dpDelta !== undefined && visibleRestrictions.length < maxVisibleBadges;
  const hiddenLabels = restrictions
    .slice(visibleRestrictions.length)
    .map(({ labelKey }) => t(labelKey));
  if (dpDelta !== undefined && !showDpBadge) {
    hiddenLabels.push(`DP ${dpDelta < 0 ? "−" : "+"}${formatDpDelta(Math.abs(dpDelta))}`);
  }
  return (
    <div className="game-restriction-badges" aria-hidden="true" onPointerOver={placeTooltip}>
      {visibleRestrictions.map((restriction) => (
        <span
          key={restriction.kind}
          className="game-restriction-badge"
          data-protection={restriction.protection || undefined}
          data-action={restriction.action || undefined}
          data-label={t(restriction.labelKey)}
          title={t(restriction.labelKey)}
        >
          <i aria-hidden="true">
            <BadgeIcon restriction={restriction} />
          </i>
          <span className="game-restriction-tooltip">{t(restriction.labelKey)}</span>
        </span>
      ))}
      {showDpBadge ? (
        <span
          className="game-restriction-badge"
          data-dp={dpDelta < 0 ? "down" : "up"}
          data-label={`DP ${dpDelta < 0 ? "−" : "+"}${formatDpDelta(Math.abs(dpDelta))}`}
          title={`DP ${dpDelta < 0 ? "−" : "+"}${formatDpDelta(Math.abs(dpDelta))}`}
        >
          <i aria-hidden="true">{dpDelta < 0 ? "↓" : "↑"}</i>
          <span className="game-restriction-tooltip">
            DP {dpDelta < 0 ? "−" : "+"}
            {formatDpDelta(Math.abs(dpDelta))}
          </span>
        </span>
      ) : null}
      {hiddenLabels.length > 0 ? (
        <span
          className="game-restriction-badge game-restriction-badge--overflow"
          data-label={hiddenLabels.join(" · ")}
          title={hiddenLabels.join(" · ")}
        >
          <b>+{hiddenLabels.length}</b>
          <span className="game-restriction-tooltip">{hiddenLabels.join(" · ")}</span>
        </span>
      ) : null}
    </div>
  );
}
