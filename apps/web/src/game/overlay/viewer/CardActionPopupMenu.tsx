import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import type { CardActionEffect, CardActionLink } from "./cardActionMenuTypes";

const item: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  border: "none",
  background: "transparent",
  color: "var(--ds-fg)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "left",
  whiteSpace: "nowrap",
};

/** Menu anchored to the card, for mouse layouts. */
export function CardActionPopupMenu({
  x,
  y,
  onClose,
  canAttack,
  canVortex,
  onViewStack,
  onAttack,
  onVortex,
  link,
  effects,
}: {
  x: number;
  y: number;
  onClose: () => void;
  canAttack: boolean;
  canVortex?: boolean;
  onViewStack: () => void;
  onAttack: () => void;
  onVortex?: () => void;
  link?: CardActionLink;
  effects?: CardActionEffect[];
}) {
  const { t } = useTranslation();
  return createPortal(
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9000 }} />
      <div
        className="card-inspector-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("game.actions")}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: x,
          top: y,
          transform: "translate(-50%, calc(-100% - 10px))",
          zIndex: 9001,
          minWidth: 150,
          background: "var(--ds-surface)",
          border: "1px solid var(--ds-border-strong)",
          borderRadius: 12,
          boxShadow: "0 16px 40px rgba(15,23,42,0.4)",
          padding: 5,
          display: "flex",
          flexDirection: "column",
          animation: "aegis-pop 120ms ease-out",
        }}
      >
        <button
          autoFocus
          style={item}
          onClick={onViewStack}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ds-surface-muted)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Icons.Search size={15} /> {t("overlay.viewStack")}
        </button>
        {canAttack ? (
          <button
            style={{ ...item, color: "var(--ds-danger)" }}
            onClick={onAttack}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ds-danger-surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icons.Swords size={15} /> {t("overlay.attack")}
          </button>
        ) : null}
        {canVortex && onVortex ? (
          <button
            style={{ ...item, color: "var(--ds-danger)" }}
            onClick={onVortex}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ds-danger-surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icons.Swords size={15} /> {t("overlay.vortexAttack")}
          </button>
        ) : null}
        {link ? (
          <button
            style={item}
            onClick={link.onLink}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ds-surface-muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icons.Link2 size={15} /> {t("overlay.link")}
          </button>
        ) : null}
        {(effects ?? []).map((effect) => (
          <button
            key={effect.label}
            style={item}
            onClick={effect.onActivate}
            title={effect.label}
            aria-label={`${t("game.activateEffect")}: ${effect.label}`}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ds-surface-muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span aria-hidden="true">⚡</span> {t("game.activateMainEffect")}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}
