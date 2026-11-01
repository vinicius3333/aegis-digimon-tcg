import { formatDp } from "@/design/formatDp";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { BadgeHint } from "@/game/piece/BadgeHint";
import { getHeldDpLabel } from "@/game/piece/getHeldDpLabel";
import { getSignedDeltaPrefix } from "@/game/piece/getSignedDeltaPrefix";

type PermanentHeldDpBadgeParams = {
  delta: number;
};

export function PermanentHeldDpBadge({ delta }: PermanentHeldDpBadgeParams) {
  const { t } = useTranslation();
  const label = getHeldDpLabel({ delta, t });
  return (
    <BadgeHint
      className="game-held-dp"
      data-held-dp={delta < 0 ? "down" : "up"}
      data-label={label}
      title={label}
      hint={{ title: label, description: t("redesign.arena.badge.heldDp") }}
    >
      <i aria-hidden="true">
        <Icons.Shield size={12} />
      </i>
      <s>
        {getSignedDeltaPrefix(delta)}
        {formatDp(Math.abs(delta))}
      </s>
    </BadgeHint>
  );
}
