import { Icons } from "../../design/icons";
import type { RestrictionBadge } from "../fieldBadges";
import { useTranslation } from "../../i18n";
import { BadgeHint } from "./BadgeHint";
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
  if (restriction.icon === "digivolveOff") return <Icons.DigivolveOff size={12} />;
  if (restriction.icon === "effectOff") return <Icons.EffectOff size={12} />;
  if (restriction.icon === "dpShield") return <Icons.DpShield size={12} />;
  if (restriction.icon === "deDigivolveShield") return <Icons.DeDigivolveShield size={12} />;
  if (restriction.icon === "deleteShield") return <Icons.DeleteShield size={12} />;
  if (restriction.icon === "returnShield") return <Icons.ReturnShield size={12} />;
  return <Icons.Ban size={12} />;
}

/**
 * The standing debuff chips for the blanket restrictions an effect has imposed
 * on a permanent (server truth: `Permanent.cannotAttack` and friends), as a column
 * of status icons down the card's right edge, and the DP change beside its DP.
 * Spoken through the wrapper's own state list, so the chips themselves stay out of
 * the accessibility tree rather than repeating it; a tap explains each one.
 */
export function PermanentRestrictionBadges({
  restrictions,
  dpDelta,
  baseDp,
}: {
  restrictions: readonly RestrictionBadge[];
  dpDelta?: number;
  /** The original DP (printed, or rewritten by an effect) the DP badge's explanation compares the change against. */
  baseDp?: number;
}) {
  const { t } = useTranslation();
  const maxVisibleBadges = 3;
  const visibleRestrictions = restrictions.slice(0, maxVisibleBadges);
  const hiddenRestrictions = restrictions.slice(visibleRestrictions.length);
  const dpLabel =
    dpDelta === undefined ? undefined : `DP ${dpDelta < 0 ? "−" : "+"}${formatDpDelta(Math.abs(dpDelta))}`;
  return (
    <div className="game-restriction-badges" aria-hidden="true">
      {visibleRestrictions.map((restriction) => (
        <BadgeHint
          key={restriction.kind}
          className="game-restriction-badge"
          data-protection={restriction.protection || undefined}
          data-action={restriction.action || undefined}
          data-label={t(restriction.labelKey)}
          title={t(restriction.labelKey)}
          hint={{
            title: t(restriction.labelKey),
            description: t(`redesign.arena.restriction.${restriction.kind}`),
          }}
        >
          <i aria-hidden="true">
            <BadgeIcon restriction={restriction} />
          </i>
        </BadgeHint>
      ))}
      {dpDelta !== undefined && dpLabel ? (
        <BadgeHint
          className="game-restriction-badge game-dp-delta-badge"
          data-dp={dpDelta < 0 ? "down" : "up"}
          data-label={dpLabel}
          title={dpLabel}
          hint={
            baseDp === undefined
              ? { title: dpLabel, description: t("redesign.arena.badge.dpChanged") }
              : {
                  title: t("redesign.arena.badge.dpTitle", { dp: (baseDp + dpDelta).toLocaleString() }),
                  description: t(dpDelta < 0 ? "redesign.arena.badge.dpDown" : "redesign.arena.badge.dpUp", {
                    base: baseDp.toLocaleString(),
                    amount: Math.abs(dpDelta).toLocaleString(),
                  }),
                }
          }
        >
          {dpDelta < 0 ? "−" : "+"}
          {formatDpDelta(Math.abs(dpDelta))}
        </BadgeHint>
      ) : null}
      {hiddenRestrictions.length > 0 ? (
        <BadgeHint
          className="game-restriction-badge game-restriction-badge--overflow"
          data-label={hiddenRestrictions.map(({ labelKey }) => t(labelKey)).join(" · ")}
          title={hiddenRestrictions.map(({ labelKey }) => t(labelKey)).join(" · ")}
          hint={{
            title: t("redesign.arena.badge.moreTitle"),
            description: hiddenRestrictions
              .map(({ kind, labelKey }) => `${t(labelKey)}: ${t(`redesign.arena.restriction.${kind}`)}`)
              .join(" "),
          }}
        >
          <b>+{hiddenRestrictions.length}</b>
        </BadgeHint>
      ) : null}
    </div>
  );
}
