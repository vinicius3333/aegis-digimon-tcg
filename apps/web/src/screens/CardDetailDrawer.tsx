/* The card detail drawer: the full card, its printed numbers and its effect text. */

import { useState, type ReactNode } from "react";
import { effectiveCopyLimit, getCardDefinition, getCardArts, resolveCardArt, restrictionLabel } from "@aegis/shared";
import { Eyebrow } from "../design/primitives";
import { CardFull } from "../design/cards";
import { formLabel, kindOf } from "../design/theme";
import { useTranslation } from "../i18n";
import "./cardLibrary.css";

/* ---------- the shared right detail drawer ---------- */
export function CardDetailDrawer({
  cardId,
  onClose,
  footer,
  artId,
  onArtChange,
}: {
  cardId: string;
  onClose: () => void;
  footer?: ReactNode;
  artId?: string;
  onArtChange?: (artId: string) => void;
}) {
  const { t } = useTranslation();
  const [browsedArt, setBrowsedArt] = useState<{ cardId: string; artId: string } | null>(null);
  const selectedArt = resolveCardArt(
    cardId,
    artId ?? (browsedArt?.cardId === cardId ? browsedArt.artId : undefined),
  ).artId;
  const arts = getCardArts(cardId);
  const def = getCardDefinition(cardId);
  if (!def) return null;
  const isDigi = kindOf(def) === "Digimon";
  const copyLimit = effectiveCopyLimit(cardId);
  const banLabel = restrictionLabel(cardId);
  return (
    <aside
      aria-labelledby="card-detail-title"
      aria-modal="true"
      className="card-detail-drawer"
      role="dialog"
      style={{
        width: 372,
        flexShrink: 0,
        borderLeft: "1px solid var(--ds-border)",
        background: "var(--ds-surface)",
        padding: 22,
        overflowY: "auto",
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <div
        className="card-detail-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}
      >
        <div id="card-detail-title">
          <Eyebrow color="var(--ds-foreground-muted)">{t("library.cardDetail")}</Eyebrow>
        </div>
        <button aria-label={t("common.close")} className="card-detail-close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="card-detail-overview">
        <div className="card-detail-preview">
          <CardFull cardId={def.cardId} artId={selectedArt} width={228} />
          {arts.length > 1 ? (
            <div className="card-art-selector" role="group" aria-label={t("library.artworks")}>
              <div className="card-art-selector__label">
                {t("library.artworks")} · {arts.length}
              </div>
              <div className="card-art-selector__choices">
                {arts.map((art, index) => {
                  const label = index === 0 ? t("library.baseArt") : t("library.alternateArt", { number: index });
                  return (
                    <button
                      type="button"
                      key={art.artId}
                      aria-label={label}
                      aria-pressed={art.artId === selectedArt}
                      onClick={() => {
                        setBrowsedArt({ cardId, artId: art.artId });
                        onArtChange?.(art.artId);
                      }}
                    >
                      <CardFull cardId={cardId} artId={art.artId} width={56} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <div className="card-detail-summary">
          <div className="card-detail-limit">
            {banLabel ? (
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#f59e0b",
                  color: "#fff",
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {banLabel}
              </span>
            ) : null}
            <span style={{ fontFamily: "var(--ds-font-mono)", fontSize: 12, color: "var(--ds-foreground-muted)" }}>
              {t("library.maxPerDeck", { count: copyLimit })}
            </span>
          </div>
          <div className="card-detail-metadata">
            <DetailRow label={t("library.rowSet")} value={def.set} mono />
            <DetailRow label={t("library.rowColor")} value={def.colors.join(" / ")} />
            <DetailRow label={t("library.rowType")} value={formLabel(def)} />
            <DetailRow label={t("library.rowPlayCost")} value={def.playCost < 0 ? "—" : String(def.playCost)} mono />
            {isDigi ? <DetailRow label={t("library.rowDp")} value={def.dp.toLocaleString()} mono /> : null}
            {def.types && def.types.length ? (
              <DetailRow label={t("library.rowTraits")} value={def.types.join(", ")} />
            ) : null}
            {def.rarity ? <DetailRow label={t("library.rowRarity")} value={def.rarity} mono /> : null}
          </div>
        </div>
      </div>
      <div className="card-detail-effects">
        <DetailEffect title={t("library.mainEffect")} text={def.effectText} />
        <DetailEffect title={t("library.inheritedEffect")} text={def.inheritedEffectText} tone="var(--ds-warning)" />
        <DetailEffect title={t("library.securityEffect")} text={def.securityEffectText} tone="var(--ds-success)" />
        {footer}
      </div>
    </aside>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div
      className="card-detail-row"
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 0",
        borderBottom: "1px solid var(--ds-border)",
      }}
    >
      <span style={{ fontSize: 12.5, color: "var(--ds-foreground-muted)" }}>{label}</span>
      <span
        style={{
          fontSize: 12.5,
          color: "var(--ds-foreground)",
          fontWeight: 500,
          fontFamily: mono ? "var(--ds-font-mono)" : "inherit",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DetailEffect({ title, text, tone }: { title: string; text?: string; tone?: string }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: tone ?? "var(--ds-primary)",
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--ds-foreground-secondary)",
          whiteSpace: "pre-line",
        }}
      >
        {readableEffectText(text)}
      </p>
    </div>
  );
}

/**
 * Historical catalog text sometimes joins independent printed clauses without a
 * space (for example BT9-109's `cards.[When Attacking]`). Preserve adjacent
 * multi-timing headers while giving punctuation-delimited clauses a visible line.
 */
export function readableEffectText(text: string): string {
  return text
    .replace(/([.\]])(?=＜)/g, "$1\n")
    .replace(/([.!?])(?=\[[^\]]+\])/g, "$1\n")
    .replace(/([^\]\s])(?=\[(?:All Turns|Your Turn|Opponent's Turn|When |On |Main\]|Security\]|Start |End ))/g, "$1\n");
}
