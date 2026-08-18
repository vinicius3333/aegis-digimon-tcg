/* What the playable card pool currently contains — the released blocks, the promo
   ranges (promos are numbered per pack, not per set, so they need their own line),
   and what is still locked. Rendered on the main menu and in the deck builder rail. */

import {
  activeProductLabels,
  activePromoCount,
  activePromoRanges,
  cardPoolLabel,
  upcomingProductLabels,
} from "@aegis/shared";
import { useTranslation } from "../i18n";

export function CardPoolNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const blocks = activeProductLabels();
  const promoRanges = activePromoRanges();
  const upcoming = upcomingProductLabels(3);

  return (
    <div
      className="card-pool-notice"
      style={{
        marginTop: compact ? 0 : 20,
        maxWidth: compact ? "none" : 430,
        padding: compact ? 12 : "14px 16px",
        borderRadius: compact ? 10 : 14,
        background: "var(--ds-primary-light)",
        border: compact ? "none" : "1px solid var(--ds-primary)",
        color: "var(--ds-foreground-secondary)",
        fontSize: compact ? 12 : 13,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: "var(--ds-primary)" }}>{t("pool.title", { set: cardPoolLabel() })}</strong>{" "}
      {t("pool.note")}
      <div style={{ marginTop: 8 }}>{t("pool.blocks", { count: blocks.length, blocks: blocks.join(", ") })}</div>
      <div style={{ marginTop: 4 }}>{t("pool.promos", { count: activePromoCount(), ranges: promoRanges.join(", ") })}</div>
      {upcoming.length > 0 ? (
        <div style={{ marginTop: 4, color: "var(--ds-foreground-muted)" }}>
          {t("pool.locked", { blocks: upcoming.join(", ") })}
        </div>
      ) : null}
    </div>
  );
}
