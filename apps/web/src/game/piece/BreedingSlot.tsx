import type { Permanent } from "@aegis/shared";
import { CardBurst } from "../CardBurst";
import type { PermanentBurst } from "../showcases";
import { useTranslation } from "../../i18n";
import type { DropAttrs } from "./types";
import { PermanentView } from "./PermanentView";

export function BreedingSlot({
  perm,
  keywordLabels,
  label,
  candidate,
  focused,
  compact,
  burst,
  width,
  onClick,
  drop,
}: {
  perm?: Permanent;
  keywordLabels?: Readonly<Record<string, string>>;
  label: string;
  candidate?: boolean;
  /** The breeding step is open: the slot is the one lit thing on a dimmed board. */
  focused?: boolean;
  compact?: boolean;
  /**
   * The burst the slot is playing: a hatch opens white into blue behind a dark
   * vignette, an evolution in breeding takes the same centre-lit treatment.
   */
  burst?: PermanentBurst;
  /** Explicit slot width; overrides the `compact` default. */
  width?: number;
  onClick?: () => void;
  drop?: DropAttrs;
}) {
  const { t } = useTranslation();
  const w = width ?? (compact ? 66 : 100);
  return (
    <div
      className={`game-breeding-slot${burst ? " game-breeding-slot--lit" : ""}${focused ? " game-breeding-slot--focus" : ""}`}
      data-burst={burst?.variant}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: compact ? 2 : 5 }}
    >
      <div
        onClick={onClick}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onClick();
              }
            : undefined
        }
        className="game-breeding-slot__box"
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? label : undefined}
        {...(drop ?? {})}
        style={{
          position: "relative",
          width: w,
          height: Math.round(w * 1.4),
          borderRadius: compact ? 8 : 12,
          border: candidate ? "2px solid var(--ds-warning)" : "1.5px dashed var(--ds-border-strong)",
          display: "grid",
          placeItems: "center",
          background: "var(--ds-surface-muted)",
          cursor: onClick ? "pointer" : "default",
          animation: candidate ? "aegis-pulse 1.2s ease-in-out infinite" : "none",
        }}
      >
        {burst ? (
          <span className="game-breeding-slot__burst" aria-hidden="true">
            <CardBurst key={burst.key} variant={burst.variant} color={burst.color} />
          </span>
        ) : null}
        {perm && perm.topCard?.cardId ? (
          <PermanentView perm={perm} keywordLabels={keywordLabels} compact={compact} width={w} />
        ) : (
          <span
            style={{
              fontSize: compact ? 8 : 10,
              color: "var(--ds-foreground-disabled)",
              fontFamily: "var(--ds-font-mono)",
            }}
          >
            {t("game.emptySlot")}
          </span>
        )}
      </div>
      <span
        style={{
          fontFamily: "var(--ds-font-mono)",
          fontSize: compact ? 8 : 10,
          letterSpacing: "0.05em",
          color: "var(--ds-foreground-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}
