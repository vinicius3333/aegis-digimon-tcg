import { Phase } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { Badge, Button, Logo } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { canUseBreedingAction } from "../../boardModel";
import { type LogLine } from "../../matchLog";
import { PHASES } from "../constants";

/** Exported for its own test; the match screen is the only place that renders it. */
export function Sidebar({
  phase,
  turnCount,
  memory,
  isMyTurn,
  canMove,
  hasBreeding,
  canHatch,
  narrow,
  log,
  onHatchOrMove,
  onSurrender,
  onReportBug,
}: {
  phase: Phase;
  turnCount: number;
  memory: number;
  isMyTurn: boolean;
  canMove: boolean;
  hasBreeding: boolean;
  canHatch: boolean;
  /** Touch layout: the action row is a two-button bar, not a labelled panel. */
  narrow?: boolean;
  log: LogLine[];
  onHatchOrMove: () => void;
  onSurrender: () => void;
  onReportBug: () => void;
}) {
  const { t } = useTranslation();
  const canBreed = canUseBreedingAction({ phase, isMyTurn, canHatch, canMove });
  return (
    <aside
      className="game-sidebar"
      style={{
        width: 296,
        flexShrink: 0,
        borderLeft: "1px solid var(--ds-border)",
        background: "var(--ds-surface)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ds-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Logo size={18} sub={false} />
          <Badge tone={isMyTurn ? "primary" : "neutral"}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isMyTurn ? "var(--ds-primary)" : "var(--ds-foreground-muted)",
              }}
            />
            {isMyTurn ? t("game.yourTurn") : t("game.opponentsTurn")}
          </Badge>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {PHASES.map((p) => (
            <div
              key={p}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 2px",
                borderRadius: 8,
                background: phase === p ? "var(--ds-primary)" : "var(--ds-surface-muted)",
                color: phase === p ? "#fff" : "var(--ds-foreground-muted)",
                fontSize: 9.5,
                fontWeight: 700,
              }}
            >
              {t(`game.phase.${p}` as const)}
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--ds-font-mono)",
            fontSize: 11,
            color: "var(--ds-foreground-muted)",
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {t("game.turnAndMemory", { turn: turnCount, memory: `${memory > 0 ? "+" : ""}${memory}` })}
        </div>
      </div>

      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--ds-border)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ds-foreground-muted)",
          }}
        >
          {t("game.actions")}
        </div>
        {/* On a phone the action row is a bare button bar with no heading, so a
            disabled button reads as an available one. Drop it instead. Ending the
            phase lives on the memory band's circular orb, like the reference client. */}
        {narrow && !canBreed ? null : (
          <Button size="sm" variant="secondary" full icon={Icons.Dices} onClick={onHatchOrMove} disabled={!canBreed}>
            {hasBreeding ? (canMove ? t("game.moveToBattle") : t("game.raising")) : t("game.hatchEgg")}
          </Button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ds-foreground-muted)",
            marginBottom: 10,
          }}
        >
          {t("game.matchLog")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {log.length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--ds-foreground-disabled)" }}>{t("game.noActions")}</span>
          ) : null}
          {log.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 8,
                fontSize: 12,
                lineHeight: 1.35,
                opacity: i === 0 ? 1 : Math.max(0.4, 0.78 - i * 0.05),
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  marginTop: 5,
                  flexShrink: 0,
                  background:
                    e.kind === "you"
                      ? "var(--ds-primary)"
                      : e.kind === "opp"
                        ? "var(--ds-danger)"
                        : "var(--ds-foreground-disabled)",
                }}
              />
              <span style={{ color: "var(--ds-foreground-secondary)" }}>{e.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Touch layout: both controls sit in the match header instead. */}
      {narrow ? null : (
        <div
          className="game-sidebar__footer"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "12px 16px",
            borderTop: "1px solid var(--ds-border)",
            background: "var(--ds-surface-muted)",
          }}
        >
          {/* The board fills the viewport, so the report button the rest of the client shows in the
              top bar would sit on top of the play area. This is its in-match home. */}
          <Button size="sm" variant="ghost" full icon={Icons.Bug} onClick={onReportBug}>
            {t("bugReport.button")}
          </Button>
          <Button size="sm" variant="ghost" full icon={Icons.LogOut} onClick={onSurrender}>
            {t("game.surrender")}
          </Button>
        </div>
      )}
    </aside>
  );
}
