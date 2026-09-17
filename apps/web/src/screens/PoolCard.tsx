/* One card in the builder's pool, with the steppers that add or remove copies. */

import { useState } from "react";
import { isBanned, restrictionLabel } from "@aegis/shared";
import { CardFull } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";

export function PoolCard({
  cardId,
  inDeck,
  atMax,
  pairConflict,
  onAdd,
  onRemove,
  onOpen,
  selected,
}: {
  cardId: string;
  inDeck: number;
  atMax: boolean;
  pairConflict: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onOpen: () => void;
  selected: boolean;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  const banLabel = pairConflict ? t("deck.pairBadge") : restrictionLabel(cardId);
  const banned = isBanned(cardId);
  const tintColor = banned || pairConflict ? "rgba(220,38,38,0.30)" : undefined;
  const hasCopies = inDeck > 0;
  return (
    <div
      style={{ position: "relative", display: "grid", placeItems: "center" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
        <CardFull
          cardId={cardId}
          width={132}
          selected={selected}
          count={hasCopies ? inDeck : undefined}
          dim={banned}
          onClick={() => {
            if (!banned && !atMax) onAdd();
          }}
        />
        {tintColor ? (
          <div
            style={{ position: "absolute", inset: 0, borderRadius: 8, background: tintColor, pointerEvents: "none" }}
          />
        ) : null}
      </div>
      {banLabel ? (
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            padding: "2px 6px",
            borderRadius: 4,
            background: banned || pairConflict ? "#dc2626" : "#f59e0b",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            lineHeight: 1.3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            zIndex: 2,
          }}
        >
          {banLabel}
        </div>
      ) : null}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        aria-label={t("deck.cardInfo")}
        title={t("deck.cardDetails")}
        style={{
          position: "absolute",
          top: 4,
          left: banLabel ? 48 : 4,
          width: 22,
          height: 22,
          borderRadius: 5,
          border: "none",
          background: "rgba(15,23,42,0.7)",
          color: "#fff",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
          opacity: hover ? 1 : 0,
          transition: "opacity 120ms",
          zIndex: 2,
        }}
      >
        ℹ
      </button>
      <div
        className="deck-pool-card-actions"
        style={{
          position: "absolute",
          inset: 0,
          opacity: hover ? 1 : 0,
          transition: "opacity 120ms",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: 8,
          pointerEvents: "none",
        }}
      >
        {hasCopies ? (
          <div className="deck-pool-card-stepper">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={t("common.remove")}
            >
              −
            </button>
            <span aria-label={`${inDeck}`}>{inDeck}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              aria-label={t("common.add")}
              disabled={atMax || banned}
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            disabled={atMax || banned}
            style={{
              pointerEvents: "auto",
              background: banned ? "var(--ds-surface-muted)" : atMax ? "var(--ds-surface-muted)" : "var(--ds-primary)",
              color: banned ? "var(--ds-foreground-disabled)" : atMax ? "var(--ds-foreground-muted)" : "#fff",
              border: "none",
              borderRadius: 9,
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: banned ? "not-allowed" : atMax ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              boxShadow: "var(--ds-shadow-md)",
            }}
          >
            <Icons.Plus size={14} />
            {banned ? t("common.banned") : atMax ? t("common.max") : t("common.add")}
          </button>
        )}
      </div>
    </div>
  );
}
