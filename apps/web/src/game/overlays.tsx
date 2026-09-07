/* In-game overlays, driven by real server state — mulligan window, block window,
   effect decision, game over, and the pre-match waiting panel. Each maps user
   choices to the typed intent callbacks GameScreen passes. The security check has
   its own centre-stage scene in ./SecurityClashView. */

import { useState, useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  cardImageUrls,
  getCardDefinition,
  type CombatPromptEvent,
  type DecisionKind,
  type DecisionRequest,
  type DecisionResponse,
  type DigiXrosRequirement,
} from "@aegis/shared";
import { Badge, Button, Dialog } from "../design/primitives";
import { CardBack, CardFull, Sigil } from "../design/cards";
import { COLORS, colorKey } from "../design/theme";
import { Icons } from "../design/icons";
import { triggerCardId, triggerLabels } from "./boardModel";
import { formatKeyword } from "./keywordDisplay";
import { gameOverSplash, type GameOverOutcome } from "./gameOverSplash";
import { pendingFateBadge, type PendingFateBadge } from "./pendingFate";
import { inspectorPlacement, type PermanentDetail } from "./permanentDetail";
import { useTranslation, type Translate, type TranslationKey } from "../i18n";
import { CardLink, CardLinkedText } from "./cardLinks";
import { eligibleDigiXrosCandidateIds } from "./digiXrosMaterialSelection";
import { TOUCH_LAYOUT_QUERY, useMediaQuery, WIDE_DIALOG_QUERY } from "../design/useMediaQuery";

const name = (cardId: string) => getCardDefinition(cardId)?.nameEn ?? cardId;

function Scrim({
  children,
  onClick,
  align = "center",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  align?: "center" | "flex-end";
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "var(--ds-scrim)",
        display: "flex",
        alignItems: align,
        justifyContent: "center",
        animation: "aegis-rise 180ms ease-out",
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- WAITING / CONNECTION ---------------- */
export function WaitingOverlay({
  title,
  detail,
  spinner = true,
  actionLabel,
  onAction,
}: {
  title: string;
  detail: string;
  spinner?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Dialog className="waiting-dialog" labelledBy="aegis-waiting-title">
      {spinner ? (
        <div className="waiting-dialog__spinner" />
      ) : (
        <div className="waiting-dialog__error">
          <Icons.CircleAlert size={30} />
        </div>
      )}
      <h2 id="aegis-waiting-title">{title}</h2>
      <p>{detail}</p>
      {actionLabel && onAction ? (
        <Button full variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Dialog>
  );
}

/* ---------------- MULLIGAN ---------------- */

/**
 * Turn order is server truth, not a guess: `matchStarted.firstSeat` names the
 * player who takes turn 1, and the mulligan window opens before any turn has
 * passed. `undefined` simply omits the accent line rather than picking a side.
 */
export type TurnOrder = "first" | "second";

export function MulliganOverlay({
  handCardIds,
  turnOrder,
  onKeep,
  onMulligan,
}: {
  handCardIds: string[];
  turnOrder?: TurnOrder;
  onKeep: () => void;
  onMulligan: () => void;
}) {
  const { t } = useTranslation();
  const [isViewingBoard, setIsViewingBoard] = useState(false);

  // The board is behind this overlay, so peeking hides the sheet entirely and
  // leaves only the way back — the same shape DecisionOverlay's board view uses.
  if (isViewingBoard) {
    const returnControl = (
      <div className="decision-board-return mulligan-return">
        <span className="decision-board-return__status" aria-live="polite">
          {t("overlay.awaitingMulligan")}
        </span>
        <Button icon={Icons.ArrowLeft} onClick={() => setIsViewingBoard(false)}>
          {t("overlay.returnToMulligan")}
        </Button>
      </div>
    );
    return typeof document === "undefined" ? returnControl : createPortal(returnControl, document.body);
  }

  return (
    <Scrim className="mulligan-scrim">
      <section className="mulligan-sheet" aria-labelledby="mulligan-title" onClick={(e) => e.stopPropagation()}>
        <Badge className="mulligan-badge" tone="primary">
          <Icons.Dices size={13} />
          {t("overlay.openingHand")}
        </Badge>
        <h2 id="mulligan-title" className="mulligan-title">
          {t("overlay.keepHand")}
        </h2>
        {turnOrder ? (
          <p className="mulligan-turn-order">
            {t(turnOrder === "first" ? "overlay.turnOrderFirst" : "overlay.turnOrderSecond")}
          </p>
        ) : null}
        <p className="mulligan-detail">{t("overlay.mulliganDetail", { count: handCardIds.length })}</p>
        <div className="mulligan-cards" aria-label={t("overlay.openingHand")}>
          {handCardIds.map((id, i) => (
            <div className="mulligan-card" key={`${id}-${i}`} style={{ animationDelay: `${i * 70}ms` }}>
              <CardFull cardId={id} width={190} />
            </div>
          ))}
        </div>
        <div className="mulligan-actions">
          <Button size="lg" icon={Icons.Check} onClick={onKeep}>
            {t("overlay.keep")}
          </Button>
          <Button size="lg" variant="secondary" icon={Icons.Dices} onClick={onMulligan}>
            {t("overlay.mulligan")}
          </Button>
          <Button size="lg" variant="ghost" icon={Icons.Map} onClick={() => setIsViewingBoard(true)}>
            {t("overlay.checkPlayArea")}
          </Button>
        </div>
      </section>
    </Scrim>
  );
}

/* ---------------- BLOCK WINDOW ---------------- */
export function BlockOverlay({
  attackerCardId,
  blockers,
  mustBlock = false,
  onBlock,
  onDecline,
}: {
  attackerCardId?: string;
  blockers: { permanentId: string; cardId: string; currentDP: number; sourceCount: number }[];
  /**
   * ＜Collision＞ (§16-30): the block is compulsory while a Digimon can make it, so the
   * window states the compulsion and drops the refusal the server would reject anyway.
   */
  mustBlock?: boolean;
  onBlock: (permanentId: string) => void;
  onDecline: () => void;
}) {
  const forced = mustBlock && blockers.length > 0;
  const { t } = useTranslation();
  return (
    <div
      className="combat-prompt"
      role="dialog"
      aria-modal="true"
      aria-label={t("overlay.blockWindow")}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 232,
        transform: "translateX(-50%)",
        zIndex: 80,
        width: 460,
        background: "var(--ds-surface)",
        border: "2px solid var(--ds-warning)",
        borderRadius: 18,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 20,
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--ds-warning-surface)",
            color: "var(--ds-warning)",
          }}
        >
          <Icons.Swords size={18} />
        </span>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--ds-font-display)",
              fontWeight: 700,
              fontSize: 17,
              color: "var(--ds-fg)",
            }}
          >
            {t("overlay.blockWindow")}
            {forced ? (
              <span
                style={{
                  fontFamily: "var(--ds-font-mono)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "var(--ds-warning-surface)",
                  color: "var(--ds-warning)",
                }}
              >
                {t("overlay.blockForced")}
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)" }}>
            {attackerCardId ? (
              <CardLinkedText
                text={t("overlay.isAttacking", { name: name(attackerCardId) })}
                cardIds={[attackerCardId]}
              />
            ) : (
              t("overlay.attackIncoming")
            )}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ds-fg-secondary)", marginBottom: 12 }}>
        {t(forced ? "overlay.blockForcedPrompt" : "overlay.blockPrompt")}
      </div>
      {blockers.length ? (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {blockers.map((b) => {
            const def = getCardDefinition(b.cardId);
            const sourceLabel = t(b.sourceCount === 1 ? "overlay.sourceCountOne" : "overlay.sourceCountMany", {
              count: b.sourceCount,
            });
            return (
              <button
                aria-label={`${name(b.cardId)}, ${b.currentDP.toLocaleString()} DP, ${sourceLabel}`}
                key={b.permanentId}
                onClick={() => onBlock(b.permanentId)}
                style={{
                  flex: "1 1 45%",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: 9,
                  borderRadius: 12,
                  cursor: "pointer",
                  background: "var(--ds-surface-muted)",
                  border: "1.5px solid var(--ds-warning)",
                  textAlign: "left",
                }}
              >
                <Sigil cardId={b.cardId} color={colorKey(def?.colors[0])} size={26} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ds-fg)" }}>{name(b.cardId)}</div>
                  <div style={{ fontFamily: "var(--ds-font-mono)", fontSize: 11, color: "var(--ds-fg-muted)" }}>
                    {b.currentDP.toLocaleString()} DP
                  </div>
                  <div style={{ fontFamily: "var(--ds-font-mono)", fontSize: 10.5, color: "var(--ds-fg-muted)" }}>
                    {sourceLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--ds-fg-muted)", marginBottom: 16 }}>{t("overlay.noBlockers")}</div>
      )}
      {forced ? null : (
        <Button full variant="secondary" icon={Icons.Shield} onClick={onDecline}>
          {t("overlay.takeAttack")}
        </Button>
      )}
    </div>
  );
}

/* ---------------- ALLIANCE / EVADE / BARRIER ---------------- */

/**
 * ＜Alliance＞ (Comprehensive Rules §16-24): when this Digimon attacks, its controller
 * may suspend one of their OTHER Digimon to add its DP (and ＜Security A. +1＞) to the
 * attacker for the battle — an optional processing condition (§16-24-3).
 */
export function AllianceOverlay({
  triggerCardId,
  allies,
  onChoose,
  onPass,
}: {
  triggerCardId?: string;
  allies: { permanentId: string; cardId: string; currentDP: number; sourceCount: number }[];
  onChoose: (allyPermanentId: string) => void;
  onPass: () => void;
}) {
  const { t } = useTranslation();
  const triggerName = triggerCardId ? name(triggerCardId) : t("overlay.yourDigimon");
  const kw = { label: "＜Alliance＞", icon: Icons.Users, action: t("overlay.allianceAction") };
  const sourceKey = colorKey(getCardDefinition(triggerCardId ?? "")?.colors[0]);

  return (
    <div
      className="combat-prompt"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 232,
        transform: "translateX(-50%)",
        zIndex: 80,
        width: 520,
        maxWidth: "calc(100% - 32px)",
        background: "var(--ds-surface)",
        border: `2px solid ${COLORS[sourceKey].base}`,
        borderRadius: 18,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 20,
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 38,
            height: 38,
            borderRadius: 11,
            flexShrink: 0,
            background: COLORS[sourceKey].soft,
            color: COLORS[sourceKey].base,
          }}
        >
          <kw.icon size={20} />
        </span>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{ fontFamily: "var(--ds-font-display)", fontWeight: 800, fontSize: 17, color: "var(--ds-fg)" }}
            >
              {kw.label}
            </span>
            <Badge tone="primary">
              <Icons.Plus size={11} />
              {t("overlay.dpBoost")}
            </Badge>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)", marginTop: 1 }}>
            {triggerCardId ? <CardLink cardId={triggerCardId} /> : triggerName} {kw.action}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ds-fg-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
        {t("overlay.alliancePrompt")}
      </div>
      {allies.length ? (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {allies.map((ally) => {
            const sourceLabel = t(ally.sourceCount === 1 ? "overlay.sourceCountOne" : "overlay.sourceCountMany", {
              count: ally.sourceCount,
            });
            return (
              <button
                key={ally.permanentId}
                onClick={() => onChoose(ally.permanentId)}
                aria-label={`${t("overlay.suspendAlly", { name: name(ally.cardId), dp: ally.currentDP.toLocaleString() })}, ${sourceLabel}`}
                style={{
                  position: "relative",
                  padding: 0,
                  border: "none",
                  borderRadius: 12,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <CardFull cardId={ally.cardId} width={104} />
                <span
                  style={{
                    position: "absolute",
                    left: 6,
                    right: 6,
                    bottom: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    padding: "3px 0",
                    borderRadius: 8,
                    background: "var(--ds-accent)",
                    color: "#fff",
                    fontFamily: "var(--ds-font-mono)",
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: "0 2px 8px rgba(15,23,42,0.35)",
                  }}
                >
                  <Icons.Plus size={12} />
                  {ally.currentDP.toLocaleString()} DP · {sourceLabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--ds-fg-muted)", marginBottom: 16 }}>{t("overlay.noAllies")}</div>
      )}
      <Button full variant="secondary" icon={Icons.ChevronRight} onClick={onPass}>
        {t("overlay.passAlliance")}
      </Button>
    </div>
  );
}

/**
 * §11-3 Counter Timing: the non-turn (defending) player may activate at most 1
 * [Counter] effect for this attack (§11-3-2). Unlike ＜Alliance＞'s "choose one of
 * these permanents", the choice here is a (source card, effect) pair — a Digimon
 * can carry more than one [Counter] effect.
 */
export function CounterOverlay({
  attackerCardId,
  eligibleCounters,
  getCardId,
  onActivate,
  onPass,
}: {
  attackerCardId?: string;
  eligibleCounters: { instanceId: string; effectKey: string; description: string }[];
  getCardId: (instanceId: string) => string | undefined;
  onActivate: (instanceId: string, effectKey: string) => void;
  onPass: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="combat-prompt"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 232,
        transform: "translateX(-50%)",
        zIndex: 80,
        width: 460,
        background: "var(--ds-surface)",
        border: "2px solid var(--ds-warning)",
        borderRadius: 18,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 20,
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--ds-warning-surface)",
            color: "var(--ds-warning)",
          }}
        >
          <Icons.Shield size={18} />
        </span>
        <div>
          <div style={{ fontFamily: "var(--ds-font-display)", fontWeight: 700, fontSize: 17, color: "var(--ds-fg)" }}>
            {t("overlay.counterTiming")}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)" }}>
            {attackerCardId ? (
              <CardLinkedText
                text={t("overlay.isAttacking", { name: name(attackerCardId) })}
                cardIds={[attackerCardId]}
              />
            ) : (
              t("overlay.attackIncoming")
            )}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ds-fg-secondary)", marginBottom: 12 }}>
        {t("overlay.counterPrompt")}
      </div>
      {eligibleCounters.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {eligibleCounters.map((c) => {
            const cardId = getCardId(c.instanceId);
            return (
              <button
                key={`${c.instanceId}-${c.effectKey}`}
                onClick={() => onActivate(c.instanceId, c.effectKey)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: 9,
                  borderRadius: 12,
                  cursor: "pointer",
                  background: "var(--ds-surface-muted)",
                  border: "1.5px solid var(--ds-warning)",
                  textAlign: "left",
                }}
              >
                {/* Inside the button that activates the counter, so the name cannot also be a
                    link — a button inside a button is invalid and unreachable by keyboard. */}
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ds-fg)" }}>
                  {cardId ? name(cardId) : t("overlay.card")}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ds-fg-muted)" }}>{c.description}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--ds-fg-muted)", marginBottom: 16 }}>{t("overlay.noCounters")}</div>
      )}
      <Button full variant="secondary" icon={Icons.ChevronRight} onClick={onPass}>
        {t("overlay.passCounter")}
      </Button>
    </div>
  );
}

export function EvadeOverlay({
  permanentId,
  getCardId,
  onAccept,
  onDecline,
}: {
  permanentId: string;
  getCardId: (permanentId: string) => string | undefined;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const cardId = getCardId(permanentId);
  return (
    <div
      className="combat-prompt"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 232,
        transform: "translateX(-50%)",
        zIndex: 80,
        width: 400,
        background: "var(--ds-surface)",
        border: "2px solid var(--ds-warning)",
        borderRadius: 18,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 20,
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--ds-warning-surface)",
            color: "var(--ds-warning)",
          }}
        >
          <Icons.Shield size={18} />
        </span>
        <div>
          <div style={{ fontFamily: "var(--ds-font-display)", fontWeight: 700, fontSize: 17, color: "var(--ds-fg)" }}>
            ＜Evade＞
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)" }}>
            {cardId ? (
              <CardLinkedText text={t("overlay.wouldBeDeleted", { name: name(cardId) })} cardIds={[cardId]} />
            ) : (
              t("overlay.wouldBeDeleted", { name: t("overlay.yourDigimon") })
            )}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ds-fg-secondary)", marginBottom: 18, lineHeight: 1.5 }}>
        {cardId ? (
          <CardLinkedText text={t("overlay.evadePrompt", { name: name(cardId) })} cardIds={[cardId]} />
        ) : (
          t("overlay.evadePrompt", { name: t("overlay.thisDigimon") })
        )}
      </div>
      <div className="game-actions-row">
        <Button full icon={Icons.Shield} onClick={onAccept}>
          {t("overlay.suspendToEvade")}
        </Button>
        <Button full variant="secondary" onClick={onDecline}>
          {t("overlay.letDeleted")}
        </Button>
      </div>
    </div>
  );
}

export function BarrierOverlay({
  permanentId,
  getCardId,
  onAccept,
  onDecline,
}: {
  permanentId: string;
  getCardId: (permanentId: string) => string | undefined;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const cardId = getCardId(permanentId);
  return (
    <div
      className="combat-prompt"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 232,
        transform: "translateX(-50%)",
        zIndex: 80,
        width: 400,
        background: "var(--ds-surface)",
        border: "2px solid var(--ds-warning)",
        borderRadius: 18,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 20,
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--ds-warning-surface)",
            color: "var(--ds-warning)",
          }}
        >
          <Icons.Shield size={18} />
        </span>
        <div>
          <div style={{ fontFamily: "var(--ds-font-display)", fontWeight: 700, fontSize: 17, color: "var(--ds-fg)" }}>
            ＜Barrier＞
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)" }}>
            {cardId ? (
              <CardLinkedText text={t("overlay.wouldBeDeleted", { name: name(cardId) })} cardIds={[cardId]} />
            ) : (
              t("overlay.wouldBeDeleted", { name: t("overlay.yourDigimon") })
            )}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ds-fg-secondary)", marginBottom: 18, lineHeight: 1.5 }}>
        {cardId ? (
          <CardLinkedText text={t("overlay.barrierPrompt", { name: name(cardId) })} cardIds={[cardId]} />
        ) : (
          t("overlay.barrierPrompt", { name: t("overlay.thisDigimon") })
        )}
      </div>
      <div className="game-actions-row">
        <Button full icon={Icons.Shield} onClick={onAccept}>
          {t("overlay.trashSecurity")}
        </Button>
        <Button full variant="secondary" onClick={onDecline}>
          {t("overlay.letDeleted")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Combat prompts BlockOverlay/CounterOverlay/AllianceOverlay/EvadeOverlay/
 * BarrierOverlay above dispatch on GameScreen.tsx's `blockWindow`/
 * `counterWindow`/`allianceWindow`/`evadeWindow`/`barrierWindow` state; this pins
 * that coverage against COMBAT_PROMPT_EVENTS so a new prompt event fails
 * typecheck instead of shipping unhandled.
 */
export const SUPPORTED_COMBAT_PROMPTS = [
  "blockWindowOpened",
  "counterWindowOpened",
  "alliancePrompt",
  "evadePrompt",
  "barrierPrompt",
] as const satisfies readonly CombatPromptEvent[];

type _SupportedCombatPromptsComplete =
  Exclude<CombatPromptEvent, (typeof SUPPORTED_COMBAT_PROMPTS)[number]> extends never ? true : never;
const _supportedCombatPromptsComplete: _SupportedCombatPromptsComplete = true;
void _supportedCombatPromptsComplete;

/** How wide and tall the inspector is allowed to get, so it can be placed before it renders. */
const INSPECTOR_WIDTH = 420;
const INSPECTOR_HEIGHT = 480;

/**
 * The permanent inspector (`PermanentDetail.cs`): the position as it stands right
 * now — its live DP against the printed figure, the keywords the server resolved,
 * the whole stack, and the fate an open effect has already pinned to it.
 *
 * It opens on the opposite side of the card that was clicked, so the card the
 * reader is asking about stays visible beside its own detail.
 */
export function PermanentDetailInspector({
  detail,
  fate,
  anchorX,
  anchorY,
  inline,
  onInteractStart,
  onInteractEnd,
}: {
  detail: PermanentDetail;
  /** The badge an open effect has already pinned to this permanent, if any. */
  fate?: PendingFateBadge;
  /** Right edge and top of the card that was clicked, in viewport coordinates. */
  anchorX: number;
  anchorY: number;
  /** Render in place rather than portalling, so a fixture stage can hold the panel. */
  inline?: boolean;
  onInteractStart?: () => void;
  onInteractEnd?: () => void;
}) {
  const { t } = useTranslation();
  const topDef = getCardDefinition(detail.cardId);
  const supporting = detail.cards.filter((card) => card.role !== "top");
  const granted = new Set(detail.grantedKeywords);
  const placement = inspectorPlacement({
    anchorX,
    anchorY,
    viewportWidth: typeof window === "undefined" ? 1280 : window.innerWidth,
    viewportHeight: typeof window === "undefined" ? 800 : window.innerHeight,
    panelWidth: INSPECTOR_WIDTH,
    panelHeight: INSPECTOR_HEIGHT,
  });

  const panel = (
    <aside
      id="opponent-permanent-inspector"
      className="opponent-permanent-inspector"
      data-side={placement.side}
      role="tooltip"
      tabIndex={0}
      onMouseEnter={onInteractStart}
      onMouseLeave={onInteractEnd}
      onFocus={onInteractStart}
      onBlur={onInteractEnd}
      style={{ left: placement.left, top: placement.top, width: INSPECTOR_WIDTH }}
    >
      <header>
        <div>
          <strong>{detail.name}</strong>
          {/* The live figure is what the position actually has; the printed one sits
              beside it only when something has moved it. */}
          <span>
            {detail.currentDP.toLocaleString()} DP
            {detail.dpDelta === 0 ? null : (
              <em data-direction={detail.dpDelta > 0 ? "up" : "down"}>
                {detail.dpDelta > 0 ? "+" : "−"}
                {Math.abs(detail.dpDelta).toLocaleString()}
              </em>
            )}
          </span>
        </div>
        <Badge>
          {t("game.stack")} · {detail.cards.length}
        </Badge>
      </header>
      {detail.dpDelta === 0 ? null : (
        <p className="opponent-permanent-inspector__base">
          {t("overlay.baseDp")}: {detail.baseDP.toLocaleString()}
        </p>
      )}
      <section className="opponent-permanent-inspector__keywords" aria-label={t("overlay.keywords")}>
        <span>{t("overlay.keywords")}</span>
        {detail.keywords.length === 0 ? (
          <p>{t("overlay.noKeywords")}</p>
        ) : (
          <ul>
            {detail.keywords.map((keyword) => (
              <li key={keyword} data-granted={granted.has(keyword) || undefined}>
                {formatKeyword(keyword)}
                {/* The server's resolved count, not the printed parameter: a granted or
                    inverted modifier is already folded into it. */}
                {keyword === "SecurityAttack" && detail.securityAttack !== undefined
                  ? ` \u00d7${detail.securityAttack}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
      {detail.restrictions.length ? (
        <ul className="opponent-permanent-inspector__restrictions" aria-label={t("overlay.restrictions")}>
          {detail.restrictions.map((restriction) => (
            <li key={restriction.kind}>{t(restriction.labelKey)}</li>
          ))}
        </ul>
      ) : null}
      {fate ? (
        <p className="opponent-permanent-inspector__fate" data-tone={fate.tone}>
          <span aria-hidden="true">{fate.glyph}</span>
          {t(fate.labelKey)}
        </p>
      ) : null}
      <section className="opponent-permanent-inspector__effect">
        <span>{t("overlay.printedEffect")}</span>
        <p>{topDef?.effectText || t("overlay.noPrintedEffect")}</p>
      </section>
      {supporting.length ? (
        <section className="opponent-permanent-inspector__stack" aria-label={t("game.stack")}>
          {supporting.map((card, index) => {
            const def = getCardDefinition(card.cardId);
            const effect = card.role === "linked" ? def?.linkEffect : def?.inheritedEffectText;
            return (
              <div key={`${card.cardId}-${index}`}>
                <CardArt cardId={card.cardId} width={38} />
                <div>
                  <strong>{def?.nameEn ?? card.cardId}</strong>
                  <span>{t(ROLE_LABEL_KEYS[card.role])}</span>
                  <p>{effect || t("overlay.noPrintedEffect")}</p>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}
    </aside>
  );
  return inline ? panel : createPortal(panel, document.body);
}

/* ---------------- EFFECT DECISION ---------------- */

/**
 * Effect timing -> the printed bracket label it appears under on the card.
 *
 * The server names a timing two ways: `effectTriggered` carries the engine's
 * EffectTiming enum key ("OnUseAttack"), while a decision's provenance carries the
 * IR trigger ("WhenAttacking"). Both spellings map here, so the notice and the
 * decision dialog slice the same clause whichever one arrives.
 */
export const TIMING_LABELS: Record<string, string> = {
  OnPlay: "On Play",
  WhenDigivolving: "When Digivolving",
  WhenAttacking: "When Attacking",
  OnUseAttack: "When Attacking",
  OnAllyAttack: "When Attacking",
  OnDeletion: "On Deletion",
  OnDestroyedAnyone: "On Deletion",
  EndOfAttack: "End of Attack",
  OnEndAttack: "End of Attack",
  AllTurns: "All Turns",
  YourTurn: "Your Turn",
  OpponentsTurn: "Opponent's Turn",
  StartOfYourTurn: "Start of Your Turn",
  EndOfYourTurn: "End of Your Turn",
  StartOfOpponentsTurn: "Start of Opponent's Turn",
  EndOfOpponentsTurn: "End of Opponent's Turn",
  StartOfYourMainPhase: "Start of Your Main Phase",
  StartOfOpponentsMainPhase: "Start of Opponent's Main Phase",
  EndOfAllTurns: "End of All Turns",
  Main: "Main",
  OnUseOption: "Main",
  // A declared activation is the turn player's [Main] ability, whether printed under
  // [Main] alone or as a [Hand]/[Trash]/[Breeding] clause that shares its header.
  OnDeclaration: "Main",
  Security: "Security",
  SecuritySkill: "Security",
  Counter: "Counter",
  OnCounterTiming: "Counter",
  Hand: "Hand",
  Trash: "Trash",
  Breeding: "Breeding",
  Rule: "Rule",
  WhenMoving: "When Moving",
  OnMove: "When Moving",
};

const GENERIC_TIMING_VARIANTS: Record<string, string[]> = {
  OnStartTurn: ["StartOfYourTurn", "StartOfOpponentsTurn"],
  OnStartMainPhase: ["StartOfYourMainPhase", "StartOfOpponentsMainPhase"],
  OnEndTurn: ["EndOfYourTurn", "EndOfOpponentsTurn", "EndOfAllTurns"],
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Slice the single printed clause for the resolving `timing` out of the card's full
 * effect text (dropping the [Digivolve]/cost preamble and any sibling clauses). The
 * printed timing brackets act as clause boundaries. Falls back to the full text when
 * the timing is unknown or its bracket is not present.
 *
 * Adjacent timing brackets share one clause body: cards like AD1-001 print
 * "[On Play] [When Digivolving] You may return ..." — a single clause that fires under
 * either timing. Such a run of brackets separated only by whitespace is treated as one
 * clause header, so BOTH timings return the full "[On Play] [When Digivolving] ..." body
 * instead of the On Play slice collapsing to an empty "[On Play]".
 */
export function effectClauseForTiming(effectText: string | undefined, timing: string | undefined): string | undefined {
  const label = timing ? TIMING_LABELS[timing] : undefined;
  if (!effectText) return effectText;
  const boundary = new RegExp(`\\[(${Object.values(TIMING_LABELS).map(escapeRegExp).join("|")})\\]`, "g");
  const marks: { label: string; index: number; end: number }[] = [];
  for (let m = boundary.exec(effectText); m !== null; m = boundary.exec(effectText)) {
    // A timing label can be mentioned inside a sentence rather than opening a new clause
    // (EX3-026: "activate 1 of this Digimon's [When Digivolving] effects"). Do not split
    // before the noun "effect(s)"; only bracket labels that introduce effect text are bounds.
    if (/^\s+effects?\b/i.test(effectText.slice(m.index + m[0].length))) continue;
    marks.push({ label: m[1] ?? "", index: m.index, end: m.index + m[0].length });
  }
  // Intrinsic pay-time reducers are represented as Static IR but their printed sentence has
  // no [Static] label. When it precedes a bracketed sibling clause (EX3-054), the prefix is
  // the exact player-facing clause; do not show the unrelated watcher beside the payment UI.
  if (timing === "Static") {
    const prefix = effectText.slice(0, marks[0]?.index ?? effectText.length).trim();
    if (prefix.length > 0) return prefix;
  }
  if (!label) return effectText;
  // Group brackets whose gap is whitespace-only into one shared clause header.
  const groups: { labels: Set<string>; start: number }[] = [];
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]!;
    const prev = groups[groups.length - 1];
    const gap = i > 0 ? effectText.slice(marks[i - 1]!.end, mark.index) : "|";
    if (prev !== undefined && gap.trim() === "") prev.labels.add(mark.label);
    else groups.push({ labels: new Set([mark.label]), start: mark.index });
  }
  const groupIdx = groups.findIndex((g) => g.labels.has(label));
  const group = groups[groupIdx];
  if (group === undefined) return effectText;
  const end = groups[groupIdx + 1]?.start ?? effectText.length;
  return effectText.slice(group.start, end).trim();
}

/**
 * Select the matching printed clause across a card's main, inherited, and Security text
 * boxes. A timing bracket can appear in more than one box, so when the caller knows the
 * resolving effect is inherited, the inherited box is searched first.
 */
export function cardEffectClauseForTiming(
  cardId: string,
  timing: string | undefined,
  isInherited = false,
): string | undefined {
  const definition = getCardDefinition(cardId);
  const boxes = isInherited
    ? [definition?.inheritedEffectText, definition?.effectText, definition?.securityEffectText]
    : [definition?.effectText, definition?.inheritedEffectText, definition?.securityEffectText];
  const texts = boxes.filter((text): text is string => Boolean(text));
  const label = timing ? TIMING_LABELS[timing] : undefined;
  const matching = label ? texts.find((text) => new RegExp(`\\[${escapeRegExp(label)}\\]`).test(text)) : undefined;
  if (matching === undefined && timing !== undefined) {
    const variants = GENERIC_TIMING_VARIANTS[timing] ?? [];
    const present = variants.flatMap((variant) => {
      const variantLabel = TIMING_LABELS[variant];
      if (variantLabel === undefined) return [];
      const text = texts.find((candidate) => new RegExp(`\\[${escapeRegExp(variantLabel)}\\]`).test(candidate));
      return text === undefined ? [] : [{ text, variant }];
    });
    if (present.length === 1) return effectClauseForTiming(present[0]!.text, present[0]!.variant);
  }
  return effectClauseForTiming(matching ?? texts[0], timing);
}

/**
 * The printed timing bracket for an engine timing name ("OnPlay" -> "[On Play]"),
 * or undefined when the timing is unknown. This is how the trigger chooser tells
 * apart two effects of one permanent, which share every other visible detail.
 */
export function printedTimingLabel(timing: string | undefined): string | undefined {
  const label = timing ? TIMING_LABELS[timing] : undefined;
  return label === undefined ? undefined : `[${label}]`;
}

/** The printed clause to surface for a resolved effect, or undefined when there is nothing worth showing. */
export function resolvedEffectClause(
  cardId: string,
  timing: string | undefined,
  isInherited = false,
): string | undefined {
  const clause = cardEffectClauseForTiming(cardId, timing, isInherited);
  const trimmed = clause?.trim();
  if (!trimmed) return undefined;
  // A bare "[On Play] [When Digivolving]" header with no body carries nothing to read.
  return trimmed.replace(/\[[^\]]*\]/g, "").trim() ? trimmed : undefined;
}

// Declarative effects use their action-kind list as a fallback description,
// e.g. "[Main] RevealAdd, PlaceInBattleAreaSelf". That is useful in diagnostics but is not
// player-facing card text. Keep accepting explicit handwritten descriptions while replacing
// this recognizable fallback shape with the printed clause from the card catalog.
const INTERNAL_IR_DESCRIPTION = /^\[[^\]]+\](?:\s+＜[^＞]+＞)?\s+[A-Z][A-Za-z0-9 -]*(?:,\s*[A-Z][A-Za-z0-9 -]*)*$/;

/**
 * Every phrase `describeAction` can render (the engine's
 * interpreter/describe.ts), as the shape it reaches the client in. The engine
 * builds a fallback description by joining these with ", " behind the effect's
 * trigger label, so a description whose every segment is one of them is a
 * generated summary rather than card text.
 *
 * The list is matched positively on purpose. Guessing at what prose looks like
 * fails on real clauses — a printed clause need not end in a period, because it
 * can close on a parenthetical — while the generated grammar is bounded and
 * enumerable. An unrecognized segment is therefore taken as card text and shown.
 */
const DESCRIBED_ACTION_PHRASES: readonly RegExp[] = [
  /^Draw -?\d+$/,
  // A target count is a number or the literal "all" (`String(action.target.count)`
  // in describeAction stringifies both), so "Delete all target(s)" is generated too.
  /^Delete (?:\d+|all) target\(s\)$/,
  /^(?:Suspend|Unsuspend) (?:\d+|all) target\(s\)$/,
  /^Trash (?:\d+|all) card\(s\)$/,
  /^Trash (?:up to )?-?\d+ card\(s\) from the top of the deck$/,
  /^Return (?:\d+|all) to [A-Za-z]+$/,
  /^Modify DP by -?\d+$/,
  /^Set base DP to -?\d+$/,
  /^Set memory to -?\d+$/,
  /^(?:Gain|Lose) \d+ memory$/,
  /^Play without paying the cost$/,
  /^Place (?:up to )?(?:\d+|all) card\(s\) under$/,
  /^Reveal top \d+ and add$/,
  /^Gain (?:＜[^＞]+＞|<[^>]+>|keyword)$/,
  /^Hatch a Digi-Egg$/,
  /^Search your deck$/,
  /^(?:Digivolve|DNA digivolve|De-Digivolve)$/,
];
const GENERATED_ACTION_PHRASES: readonly RegExp[] = [
  ...DESCRIBED_ACTION_PHRASES,
  // The last resort in describeAction: an unmapped action kind, either raw
  // ("SubTrigger", "Aura") or spaced out of camel case ("Place in battle area self").
  // Too loose to judge a prompt by: any capitalised sentence of plain words fits.
  /^[A-Z][A-Za-z0-9]*$/,
  /^[A-Z][a-z0-9]*(?: [a-z0-9]+)+$/,
];

/** A watcher's event name, e.g. "whenSecurityRemoved" — one camelCase or PascalCase token. */
const INTERNAL_WATCHER_DESCRIPTION = /^[A-Za-z][A-Za-z0-9]*$/;

/**
 * Whether a description is the engine's own summary of an effect rather than the
 * card's text.
 *
 * The shape above only catches summaries whose actions are bare kinds joined into
 * one string. Everything `describeAction` renders as a phrase escaped it —
 * "Delete 1 target(s)" and "Place 1 card(s) under" carry parentheses, "Gain
 * ＜Rush＞" carries a keyword bracket — and reached the board as-is.
 */
function isInternalEffectDescription(text: string): boolean {
  if (INTERNAL_IR_DESCRIPTION.test(text)) return true;
  // A watcher is described by the event it watches ("whenSecurityRemoved"): an identifier
  // the engine reads, never a clause a player can. Card text is a sentence, so a single
  // unspaced token is the engine's own name for the effect.
  if (INTERNAL_WATCHER_DESCRIPTION.test(text)) return true;
  const body = text
    .replace(/^(?:\s*\[[^\]]*\])+/, "")
    .replace(/^\s*＜[^＞]+＞/, "")
    .trim();
  // A trigger label with no actions behind it carries nothing to read.
  if (body.length === 0) return true;
  return body
    .split(",")
    .map((segment) => segment.trim())
    .every((segment) => segment.length > 0 && GENERATED_ACTION_PHRASES.some((shape) => shape.test(segment)));
}

// An "activate this?" prompt built from an unmapped IR action kind arrives as a bare
// identifier ("GainMemory", "gainMemory"): readable in a log, meaningless in a modal. Drop
// it so the overlay falls back to its generic prompt and the printed clause carries the
// meaning. Other decision kinds prompt with a card name, which is single-token by nature.
const INTERNAL_IDENTIFIER_PROMPT = /^[A-Za-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+$/;
const INTERNAL_ACTION_PROMPT = /^(?:attack|delete|digivolve|draw|play|return|suspend|trash|unsuspend)$/i;

/** The prompt to show above a decision, or undefined when the engine sent an internal identifier. */
export function playerFacingPromptText(promptText: string | undefined, kind: DecisionKind): string | undefined {
  const trimmed = promptText?.trim();
  if (!trimmed) return undefined;
  if (/^select bind$/i.test(trimmed)) return undefined;
  // Generic engine verbs add no guidance beyond the decision kind and leak English into
  // localized matches. Let the modal use its translated fallback while the printed effect
  // clause explains what is being selected.
  if (/^(?:choose targets?|select cards?|choose one effect to activate)$/i.test(trimmed)) return undefined;
  if (kind !== "optional") return trimmed;
  // A reducer or keyword effect asks with the engine's own summary of what it does
  // ("Draw 2", "Gain 2 memory"), which the printed clause under the prompt already says.
  return INTERNAL_IDENTIFIER_PROMPT.test(trimmed) ||
    INTERNAL_ACTION_PROMPT.test(trimmed) ||
    DESCRIBED_ACTION_PHRASES.some((shape) => shape.test(trimmed))
    ? undefined
    : trimmed;
}

export function playerFacingEffectClause({
  cardId,
  timing,
  description,
  isInherited,
}: {
  cardId: string;
  timing: string | undefined;
  description: string | undefined;
  isInherited?: boolean;
}): string | undefined {
  const supplied = description?.trim();
  if (supplied && !isInternalEffectDescription(supplied)) {
    const definition = getCardDefinition(cardId);
    const isFullMainText = definition?.effectText?.trim() === supplied;
    return isFullMainText && timing !== undefined ? effectClauseForTiming(supplied, timing) : supplied;
  }
  // Without timing provenance, choosing the first printed text box can attribute a
  // main effect to an inherited decision. Prefer showing nothing over a wrong clause.
  if (timing === undefined) return undefined;
  return resolvedEffectClause(cardId, timing, isInherited === true);
}

/**
 * DecisionOverlay below branches on request.kind via isOptional/isChoose/
 * isSelect/isOrderTriggers (mulligan is handled separately by
 * MulliganOverlay). This pins that coverage against DECISION_KINDS so a new
 * DecisionRequest.kind fails typecheck instead of rendering nothing.
 */
export const SUPPORTED_DECISION_KINDS = [
  "optional",
  "chooseTargets",
  "selectCards",
  "orderCards",
  "orderTriggers",
  "chooseOption",
  "mulligan",
] as const satisfies readonly DecisionKind[];

type _SupportedDecisionKindsComplete =
  Exclude<DecisionKind, (typeof SUPPORTED_DECISION_KINDS)[number]> extends never ? true : never;
const _supportedDecisionKindsComplete: _SupportedDecisionKindsComplete = true;
void _supportedDecisionKindsComplete;

/** Per-trigger chrome the board supplies for the chooser: where it fires from, and its clause in one line. */
export interface TriggerDetail {
  sourceLabel?: string;
  summary?: string;
}

/*
   The choices a `chooseOption` decision names are the engine's own words for where a card
   goes — the destination keys `RevealAdd` builds its prompt from, and the two deck ends an
   ordering asks about. Printed straight, a Zenith-style "add it or play it" prompt offered
   buttons reading "hand" and "play"; each one gets the sentence a player would recognise.
*/
const CHOICE_LABEL_KEYS: Readonly<Record<string, TranslationKey>> = {
  top: "overlay.deckTop",
  bottom: "overlay.deckBottom",
  hand: "overlay.dispositionHand",
  play: "overlay.dispositionPlay",
  useOption: "overlay.dispositionUseOption",
  trash: "overlay.dispositionTrash",
  digivolve: "overlay.dispositionDigivolve",
  security: "overlay.dispositionSecurity",
  placeUnder: "overlay.dispositionPlaceUnder",
  underTamer: "overlay.dispositionUnderTamer",
};

export function DecisionOverlay({
  request,
  sourceCardId,
  candidates,
  picks,
  triggerDetails = [],
  onTogglePick,
  onRespond,
}: {
  request: DecisionRequest;
  sourceCardId?: string;
  candidates: {
    instanceId: string;
    cardId?: string;
    selectable?: boolean;
    sourceCount?: number;
    currentDP?: number;
    isSuspended?: boolean;
  }[];
  picks: string[];
  /** Aligned to `request.options.triggerKeys`; empty means the chooser shows names only. */
  triggerDetails?: readonly TriggerDetail[];
  onTogglePick: (instanceId: string) => void;
  onRespond: (response: DecisionResponse) => void;
}) {
  const { t } = useTranslation();
  const wideDialog = useMediaQuery(WIDE_DIALOG_QUERY);
  const min = request.options?.min ?? 1;
  const max = request.options?.max ?? 1;
  const choices = request.options?.choices ?? [];
  const isOptional = request.kind === "optional";
  const isChoose = request.kind === "chooseOption";
  const isSelect = request.kind === "chooseTargets" || request.kind === "selectCards";
  const isOrderCards = request.kind === "orderCards";
  const isOrderTriggers = request.kind === "orderTriggers";
  const triggerKeys = request.options?.triggerKeys ?? [];
  const triggerCardIds = request.options?.triggerCardIds ?? [];
  const triggerKeyLabels = triggerLabels(triggerKeys, t, triggerCardIds);
  // Two effects of ONE permanent reach the chooser with the same name and art; the
  // window each fired in is the only honest thing that separates them.
  const triggerTimingLabels = triggerKeys.map((_key, index) =>
    printedTimingLabel(request.options?.triggerTimings?.[index] || undefined),
  );
  const distinctTriggerSummaries = new Set(triggerDetails.map((detail) => detail?.summary ?? "")).size;
  const maxTotalPlayCost = request.options?.maxTotalPlayCost;
  const selectedPlayCost = picks.reduce((total, instanceId) => {
    const cardId = candidates.find((candidate) => candidate.instanceId === instanceId)?.cardId;
    return total + (getCardDefinition(cardId ?? "")?.playCost ?? 0);
  }, 0);
  const withinPlayCostBudget = maxTotalPlayCost === undefined || selectedPlayCost <= maxTotalPlayCost;
  const canConfirm = picks.length >= min && picks.length <= max && withinPlayCostBudget;
  const cardIdTotals = new Map<string, number>();
  for (const candidate of candidates) {
    if (candidate.cardId) cardIdTotals.set(candidate.cardId, (cardIdTotals.get(candidate.cardId) ?? 0) + 1);
  }
  const cardIdSeen = new Map<string, number>();
  const cardCopyLabels = new Map<string, string>();
  for (const candidate of candidates) {
    if (!candidate.cardId) continue;
    const total = cardIdTotals.get(candidate.cardId) ?? 0;
    const index = (cardIdSeen.get(candidate.cardId) ?? 0) + 1;
    cardIdSeen.set(candidate.cardId, index);
    if (total > 1) cardCopyLabels.set(candidate.instanceId, t("overlay.cardCopy", { index, total }));
  }
  const candidateCardWidth = wideDialog ? 154 : 110;
  // The fate every picked target meets, or nothing when the engine did not
  // project one for the action that raised this prompt.
  const fateBadge = request.options?.targetFate ? pendingFateBadge(request.options.targetFate) : undefined;
  // Past this many the grid would wrap into rows taller than the sheet, so it
  // becomes one scrolling row with a visible track instead (reference #110).
  const scrollCandidates = candidates.length > 6;
  const abstractTargetLabel = (instanceId: string): string | undefined => {
    if (instanceId === "mine") return t("overlay.yourSecurity");
    if (instanceId === "player" || instanceId === "opponent") return t("overlay.opponentSecurity");
    return undefined;
  };
  const choiceLabel = (choice: string): string => {
    const key = CHOICE_LABEL_KEYS[choice];
    // Anything the server has not been taught a label for still reads: the raw
    // choice is the fallback, so a new disposition ships as a plain word rather
    // than as a blank button.
    return key === undefined ? choice : t(key);
  };

  const [isViewingBoard, setIsViewingBoard] = useState(false);
  const [selectedTriggerKeys, setSelectedTriggerKeys] = useState<string[]>([]);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnControlRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setIsViewingBoard(false);
  }, [request.decisionId]);
  useEffect(() => {
    setSelectedTriggerKeys([]);
  }, [request.decisionId]);
  useEffect(() => {
    setCardOrder(candidates.map((candidate) => candidate.instanceId));
  }, [request.decisionId]);
  useEffect(() => {
    if (isViewingBoard) returnControlRef.current?.querySelector("button")?.focus();
    else panelRef.current?.focus();
  }, [isViewingBoard]);

  const moveOrderedCard = (index: number, delta: -1 | 1) => {
    setCardOrder((current) => {
      const destination = index + delta;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  };

  const toggleTrigger = (key: string) => {
    setSelectedTriggerKeys((prev) => (prev[0] === key ? [] : [key]));
  };

  const containDialogFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const confirmSelect = () => {
    if (request.kind === "selectCards") onRespond({ kind: "selectCards", instanceIds: picks });
    else onRespond({ kind: "chooseTargets", instanceIds: picks });
  };

  const sourceEffectText = sourceCardId
    ? playerFacingEffectClause({
        cardId: sourceCardId,
        timing: request.options?.timing,
        description: request.options?.effectText,
      })
    : request.options?.effectText;
  /* The dialog is named by a plain string rather than by its visible title: that title
     now carries the source card as a link, and an aria-labelledby would read the link's
     own label ("Open …") in place of the card's name. */
  const dialogLabel = sourceCardId ? t("overlay.cardEffect", { name: name(sourceCardId) }) : t("overlay.effect");

  const genericPrompt = t(
    isOptional ? "overlay.useEffectPrompt" : isChoose ? "overlay.chooseEffectPrompt" : "overlay.resolveEffect",
  );
  // The eyebrow above already names the source card; repeating it as the title says nothing twice.
  const specificPrompt = playerFacingPromptText(request.promptText, request.kind);
  const promptText =
    request.options?.promptKey === "activateBlitz"
      ? t("overlay.activateBlitzPrompt")
      : !specificPrompt || (sourceCardId && specificPrompt === name(sourceCardId))
        ? genericPrompt
        : specificPrompt;

  if (isViewingBoard) {
    const returnControl = (
      <div
        ref={returnControlRef}
        className="decision-board-return"
        style={{
          position: "fixed",
          zIndex: "calc(var(--ds-z-toast, 110) - 1)",
          right: 16,
          top: "calc(env(safe-area-inset-top, 0px) + 64px)",
          bottom: "auto",
        }}
      >
        <span className="decision-board-return__status" aria-live="polite">
          {t("overlay.decisionPending")}
        </span>
        <Button icon={Icons.ArrowLeft} onClick={() => setIsViewingBoard(false)}>
          {t("overlay.returnToDecision")}
        </Button>
      </div>
    );
    // The game overlays normally live inside #aegis-stage, which is itself a
    // fixed, overflow-clipped viewport. Mobile browsers can therefore clip a
    // fixed descendant after the board fills 100dvh. Keep the only route back
    // to the pending decision in the document viewport, below the opponent bar
    // instead of beside browser chrome at the bottom edge.
    return typeof document === "undefined" ? returnControl : createPortal(returnControl, document.body);
  }

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      className={`game-modal__panel game-modal__panel--bare decision-overlay${wideDialog ? " decision-overlay--wide" : ""}`}
      onKeyDown={containDialogFocus}
      style={{
        position: "absolute",
        left: "50%",
        top: 96,
        transform: "translateX(-50%)",
        zIndex: 80,
        width: wideDialog ? 1000 : 600,
        maxWidth: "calc(100% - 32px)",
        maxHeight: "calc(100% - 112px)",
        overflowY: "auto",
        background: "var(--ds-surface)",
        border: "2px solid var(--ds-accent)",
        borderRadius: 20,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 22,
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <div
        className="decision-overlay__header"
        style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: sourceEffectText ? 10 : 14 }}
      >
        <div className="decision-overlay__heading">
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ds-accent)",
            }}
          >
            {sourceCardId ? (
              <CardLinkedText text={t("overlay.cardEffect", { name: name(sourceCardId) })} cardIds={[sourceCardId]} />
            ) : (
              t("overlay.effect")
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--ds-font-display)",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--ds-fg)",
              marginTop: 2,
            }}
          >
            {promptText}
          </div>
        </div>
        <Button
          className="decision-overlay__view-board"
          size="sm"
          variant="secondary"
          icon={Icons.Map}
          onClick={() => setIsViewingBoard(true)}
        >
          {t("overlay.viewBoard")}
        </Button>
      </div>

      {sourceEffectText ? (
        <div
          style={{
            fontSize: 12,
            color: "var(--ds-fg-secondary)",
            lineHeight: 1.55,
            background: "var(--ds-surface-muted)",
            borderRadius: 10,
            padding: "8px 12px",
            marginBottom: 14,
            maxHeight: 72,
            overflowY: "auto",
          }}
        >
          {sourceEffectText}
        </div>
      ) : null}

      {isSelect ? (
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ds-fg-muted)",
              marginBottom: 10,
            }}
          >
            {t("overlay.selectTargets", { range: min === max ? max : `${min}–${max}` })}
            <span style={{ float: "right", color: picks.length ? "var(--ds-accent)" : "inherit" }}>
              {t("overlay.chosen", { count: picks.length })}
            </span>
          </div>
          {maxTotalPlayCost !== undefined ? (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: withinPlayCostBudget ? "var(--ds-fg-secondary)" : "var(--ds-danger)",
                marginBottom: 10,
              }}
            >
              {t("overlay.playCostBudget", { selected: selectedPlayCost, max: maxTotalPlayCost })}
            </div>
          ) : null}
          <div className={`decision-overlay__grid${scrollCandidates ? " decision-overlay__grid--scroll" : ""}`}>
            {candidates.map((cand) => {
              const selectable = cand.selectable !== false;
              const on = picks.includes(cand.instanceId);
              const abstractLabel = abstractTargetLabel(cand.instanceId);
              const copyLabel = cardCopyLabels.get(cand.instanceId);
              const sourceLabel =
                cand.sourceCount === undefined
                  ? undefined
                  : t(cand.sourceCount === 1 ? "overlay.sourceCountOne" : "overlay.sourceCountMany", {
                      count: cand.sourceCount,
                    });
              const liveLabels = [
                cand.currentDP === undefined ? undefined : `${cand.currentDP.toLocaleString()} DP`,
                cand.isSuspended === true ? t("overlay.suspended") : undefined,
                sourceLabel,
              ].filter((label): label is string => label !== undefined);
              const liveLabel = liveLabels.join(" · ");
              return (
                <button
                  type="button"
                  aria-label={`${abstractLabel ?? (cand.cardId ? name(cand.cardId) : t("overlay.card"))}${liveLabels.length ? `, ${liveLabels.join(", ")}` : ""}${copyLabel ? `, ${copyLabel}` : ""}${on ? t("overlay.selected") : ""}`}
                  aria-pressed={on}
                  disabled={!selectable}
                  key={cand.instanceId}
                  style={{
                    position: "relative",
                    padding: 0,
                    border: "none",
                    borderRadius: 10,
                    background: "transparent",
                    cursor: selectable ? "pointer" : "not-allowed",
                    opacity: selectable ? 1 : 0.4,
                    filter: selectable ? "none" : "grayscale(0.85)",
                  }}
                  onClick={() => selectable && onTogglePick(cand.instanceId)}
                >
                  {abstractLabel ? (
                    <span
                      style={{
                        width: candidateCardWidth,
                        minHeight: candidateCardWidth * 1.4,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: 12,
                        borderRadius: 10,
                        border: `2px solid ${on ? "var(--ds-accent)" : "var(--ds-border)"}`,
                        background: "var(--ds-surface-muted)",
                        color: on ? "var(--ds-accent)" : "var(--ds-fg-secondary)",
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                    >
                      <Icons.Shield size={30} />
                      {abstractLabel}
                    </span>
                  ) : (
                    <CardFull cardId={cand.cardId ?? ""} width={candidateCardWidth} selected={on} />
                  )}
                  {on && max > 1 ? (
                    <span className="decision-overlay__order-badge" aria-hidden="true">
                      {picks.indexOf(cand.instanceId) + 1}
                    </span>
                  ) : null}
                  {/* What the effect will do to this card, once it has been
                      chosen. Server truth: `options.targetFate` is projected from
                      the IR action that raised the prompt, so the badge never
                      guesses an outcome out of the prompt's English. */}
                  {on && fateBadge ? (
                    <span
                      className={`game-fate-badge game-fate-badge--${fateBadge.tone} decision-overlay__fate`}
                      data-fate={fateBadge.fate}
                      // The prompt above already reads the effect out in full, so
                      // the pill must not also rewrite this tile's own name.
                      aria-hidden="true"
                    >
                      <i aria-hidden="true">{fateBadge.glyph}</i>
                      {t(fateBadge.labelKey)}
                    </span>
                  ) : null}
                  {liveLabel ? (
                    <span
                      style={{
                        position: "absolute",
                        left: 6,
                        bottom: 6,
                        padding: "3px 7px",
                        borderRadius: 7,
                        background: "var(--ds-surface)",
                        color: "var(--ds-fg)",
                        fontFamily: "var(--ds-font-mono)",
                        fontSize: 10,
                        fontWeight: 700,
                        boxShadow: "var(--ds-shadow-sm)",
                      }}
                    >
                      {liveLabel}
                    </span>
                  ) : null}
                  {on ? (
                    <span
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        color: "var(--ds-accent)",
                        background: "var(--ds-surface)",
                        borderRadius: "50%",
                      }}
                    >
                      <Icons.CircleCheck size={18} />
                    </span>
                  ) : null}
                  {!selectable ? (
                    <span
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        color: "var(--ds-fg-muted)",
                        background: "var(--ds-surface)",
                        borderRadius: "50%",
                      }}
                    >
                      <Icons.Ban size={16} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {isOrderCards ? (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: "var(--ds-fg-secondary)", marginBottom: 10 }}>
            {t(
              request.options?.orderDestination === "stackBottom"
                ? "overlay.orderStackBottomHint"
                : "overlay.orderCardsHint",
            )}
          </div>
          {request.options?.orderDestination === "deckBottom" ? (
            <p className="decision-overlay__subtitle">{t("overlay.orderDeckBottomHint")}</p>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cardOrder.map((instanceId, index) => {
              const card = candidates.find((candidate) => candidate.instanceId === instanceId);
              return (
                <div
                  key={instanceId}
                  className="decision-overlay__order-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 8,
                    borderRadius: 12,
                    background: "var(--ds-surface-muted)",
                    animation: "aegis-rise 160ms ease-out",
                  }}
                >
                  <div className="decision-overlay__order-card">
                    <CardFull cardId={card?.cardId ?? ""} width={wideDialog ? 86 : 62} />
                    <span className="decision-overlay__order-badge" aria-hidden="true">
                      {index + 1}
                    </span>
                  </div>
                  <span style={{ flex: 1, fontWeight: 600 }}>
                    <CardLink cardId={card?.cardId} />
                  </span>
                  <Button
                    variant="ghost"
                    disabled={index === 0}
                    onClick={() => moveOrderedCard(index, -1)}
                    aria-label={`${t("overlay.moveUp")}, ${card?.cardId ? name(card.cardId) : t("overlay.card")}, ${index + 1}`}
                  >
                    <Icons.ChevronUp size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={index === cardOrder.length - 1}
                    onClick={() => moveOrderedCard(index, 1)}
                    aria-label={`${t("overlay.moveDown")}, ${card?.cardId ? name(card.cardId) : t("overlay.card")}, ${index + 1}`}
                  >
                    <Icons.ChevronDown size={18} />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isChoose ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {choices.map((label, i) => (
            <Button
              key={i}
              full
              variant={i === 0 ? "primary" : "secondary"}
              onClick={() => onRespond({ kind: "chooseOption", optionIndex: i })}
            >
              {choiceLabel(label)}
            </Button>
          ))}
        </div>
      ) : null}

      {isOptional ? (
        <div className="game-actions-row">
          <Button full icon={Icons.Sparkles} onClick={() => onRespond({ kind: "optional", accept: true })}>
            {t("overlay.activate")}
          </Button>
          <Button full variant="secondary" onClick={() => onRespond({ kind: "optional", accept: false })}>
            {t("overlay.decline")}
          </Button>
        </div>
      ) : null}

      {isSelect ? (
        <div className="game-actions-row">
          <Button full icon={Icons.Check} disabled={!canConfirm} onClick={confirmSelect}>
            {t("overlay.confirmTargets")}
          </Button>
          {min === 0 ? (
            <Button
              full
              variant="ghost"
              onClick={() =>
                onRespond({ kind: request.kind === "selectCards" ? "selectCards" : "chooseTargets", instanceIds: [] })
              }
            >
              {t("common.none")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {isOrderTriggers ? (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ds-fg-muted)",
              marginBottom: 10,
            }}
          >
            {t(triggerKeys.length === 1 ? "overlay.confirmPendingEffect" : "overlay.chooseNextEffect")}
          </div>
          <div className="trigger-chooser">
            {triggerKeys.map((key, i) => {
              const chosen = selectedTriggerKeys.includes(key);
              const cardId = triggerCardIds[i] ?? triggerCardId(key);
              const detail = triggerDetails[i];
              // The clause is already printed in full above the list, so repeating it
              // per option only truncates the same sentence twice. It earns its space
              // only where the options genuinely say different things.
              const summary = distinctTriggerSummaries > 1 ? detail?.summary : undefined;
              const timingLabel = triggerTimingLabels[i];
              return (
                <button
                  type="button"
                  key={key}
                  className={`trigger-chooser__option${chosen ? " trigger-chooser__option--chosen" : ""}`}
                  aria-label={[timingLabel, triggerKeyLabels[i], detail?.sourceLabel, summary]
                    .filter(Boolean)
                    .join(", ")}
                  aria-pressed={chosen}
                  onClick={() => toggleTrigger(key)}
                >
                  <span className="trigger-chooser__card">
                    <CardFull cardId={cardId} width={wideDialog ? 128 : 96} selected={chosen} />
                    {summary ? <span className="trigger-chooser__summary">{summary}</span> : null}
                  </span>
                  <span className="trigger-chooser__meta">
                    {timingLabel ? <span className="trigger-chooser__timing">{timingLabel}</span> : null}
                    <span className="trigger-chooser__name">{triggerKeyLabels[i]}</span>
                    {detail?.sourceLabel ? <span className="trigger-chooser__source">{detail.sourceLabel}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            full
            icon={Icons.Check}
            disabled={selectedTriggerKeys.length !== 1}
            onClick={() => onRespond({ kind: "orderTriggers", order: selectedTriggerKeys })}
          >
            {t(triggerKeys.length === 1 ? "overlay.resolveEffect" : "overlay.resolveNextEffect")}
          </Button>
        </div>
      ) : null}
      {isOrderCards ? (
        <Button full icon={Icons.Check} onClick={() => onRespond({ kind: "orderCards", order: cardOrder })}>
          {t("overlay.confirmOrder")}
        </Button>
      ) : null}
    </div>
  );
}

/* The breeding step has no dialog of its own: hatching, moving out and ending the
   step are all answered on the board — the egg deck, the raising slot and the
   turn control — with a hint beside them instead of a modal. See GameScreen. */

/* ---------------- GAME OVER ---------------- */

/**
 * The match's last moment. The reference client gives the ending the whole
 * screen — a black field, one enormous WIN or LOSE, the reason under it and a
 * single way out — rather than a dialog on top of a board nobody is playing any
 * more, so this does the same: the board is hidden behind it, the word scales and
 * lights up once, and then everything settles and stops moving.
 *
 * Both halves of the ending are server truth. `gameOver` carries a discriminated
 * `result` and one of four `reason` codes; `gameOverSplash` only turns that pair
 * into words (game/gameOverSplash.ts).
 */
export function GameOverOverlay({
  result,
  reason,
  stats,
  onMenu,
  onRematch,
}: {
  result: GameOverOutcome;
  reason: string;
  stats: { value: number | string; label: string }[];
  onMenu: () => void;
  onRematch: () => void;
}) {
  const { t } = useTranslation();
  const splash = gameOverSplash(result, reason);
  return (
    <div
      className={`game-result game-result--${splash.tone}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="aegis-game-over-title"
    >
      <div className="game-result__rays" aria-hidden="true" />
      <div className="game-result__panel">
        <p className="game-result__eyebrow">{t("overlay.matchComplete")}</p>
        <h1 id="aegis-game-over-title" className="game-result__title">
          {t(splash.titleKey)}
        </h1>
        <p className="game-result__reason">{t(splash.reasonKey)}</p>
        <div className="game-result__stats">
          {stats.map((entry) => (
            <div key={entry.label} className="game-result__stat">
              <span className="game-result__stat-value">{entry.value}</span>
              <span className="game-result__stat-label">{entry.label}</span>
            </div>
          ))}
        </div>
        <div className="game-actions-row">
          <Button full icon={Icons.Swords} onClick={onRematch}>
            {t("overlay.findRematch")}
          </Button>
          <Button full variant="secondary" icon={Icons.LayoutDashboard} onClick={onMenu}>
            {t("overlay.mainMenu")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- EVO COST CHOICE ---------------- */

export function ActionConfirmationOverlay({
  cardId,
  title,
  detail,
  confirmLabel,
  alternateLabel,
  onConfirm,
  onAlternate,
  onCancel,
}: {
  cardId: string;
  title: string;
  detail: string;
  confirmLabel: string;
  alternateLabel?: string;
  onConfirm: () => void;
  onAlternate?: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="game-modal"
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 86,
        display: "grid",
        placeItems: "center",
        background: "rgba(15,23,42,0.42)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        className="game-modal__panel action-confirmation"
        style={{
          width: 480,
          maxWidth: "calc(100% - 32px)",
          padding: 22,
          borderRadius: 20,
          background: "var(--ds-surface)",
          border: "2px solid var(--ds-accent)",
          boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
          <CardFull cardId={cardId} width={92} />
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "var(--ds-accent)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {title}
            </div>
            <div style={{ marginTop: 7, color: "var(--ds-fg)", fontSize: 15, lineHeight: 1.45 }}>{detail}</div>
          </div>
        </div>
        <div className="game-actions-row">
          <Button full onClick={onConfirm}>
            {confirmLabel}
          </Button>
          {alternateLabel && onAlternate ? (
            <Button full variant="secondary" onClick={onAlternate}>
              {alternateLabel}
            </Button>
          ) : null}
          <Button full variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EvoCostChoiceOverlay({
  evolvingCardId,
  baseName,
  options,
  onConfirm,
  onCancel,
}: {
  evolvingCardId: string;
  baseName: string;
  options: Array<{ type: "normal" | "alternate"; label: string; cost: number }>;
  onConfirm: (useAlternate: boolean) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="combat-prompt evo-cost-prompt"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: "50%",
        top: 120,
        transform: "translateX(-50%)",
        zIndex: 85,
        width: 420,
        background: "var(--ds-surface)",
        border: "2px solid var(--ds-accent)",
        borderRadius: 20,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 22,
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <CardArt cardId={evolvingCardId} width={56} />
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ds-accent)",
            }}
          >
            {t("overlay.digivolveCost")}
          </div>
          <div
            style={{
              fontFamily: "var(--ds-font-display)",
              fontWeight: 700,
              fontSize: 17,
              color: "var(--ds-fg)",
              marginTop: 2,
            }}
          >
            {name(evolvingCardId)} → {baseName}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {[...options]
          .sort((a, b) => a.cost - b.cost)
          .map((opt) => (
            <Button
              key={opt.type}
              full
              variant={opt.type === "alternate" ? "secondary" : "primary"}
              onClick={() => onConfirm(opt.type === "alternate")}
            >
              {t("overlay.costMemory", { label: opt.label, cost: opt.cost })}
            </Button>
          ))}
      </div>

      <Button full variant="ghost" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
    </div>
  );
}

/* ---------------- CARD ACTION MENU ---------------- */

/**
 * Small popup anchored above a clicked field card. Always offers "View stack";
 * offers "Attack" only when the caller deems the card eligible (your Digimon, your
 * Main phase, unsuspended). Closes on any outside click via a full-screen backdrop.
 */
export function CardActionMenu({
  x,
  y,
  cardId,
  sheet,
  dp,
  baseDP,
  keywords,
  stackCards,
  suspended,
  promote,
  effects,
  canAttack,
  canVortex,
  onViewStack,
  onAttack,
  onVortex,
  onClose,
}: {
  x: number;
  y: number;
  /** Card shown alongside the actions in `sheet` mode. */
  cardId?: string;
  /** Render as a bottom sheet (touch layouts) instead of a menu anchored to the card. */
  sheet?: boolean;
  /** Live permanent stats, shown in `sheet` mode. */
  dp?: number;
  baseDP?: number;
  keywords?: readonly string[];
  stackCards?: StackCard[];
  suspended?: boolean;
  /** Extra action for a breeding-area card (hatch / move to the battle area). */
  promote?: { label: string; onPromote: () => void };
  /** Activatable [Main] effects of this permanent, one entry per effect. */
  effects?: { label: string; onActivate: () => void }[];
  canAttack: boolean;
  canVortex?: boolean;
  onViewStack: () => void;
  onAttack: () => void;
  onVortex?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [zoomed, setZoomed] = useState<string | null>(null);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  if (sheet) {
    const def = getCardDefinition(cardId ?? "");
    const dpDelta = dp != null && baseDP != null ? dp - baseDP : 0;
    const beneath = (stackCards ?? []).filter((c) => c.role !== "top");
    const liveInfo = (
      <>
        <strong>{def?.nameEn ?? cardId}</strong>
        <div className="card-action-sheet__stats">
          {def?.level ? <span>Lv.{def.level}</span> : null}
          {dp != null ? (
            <span>
              {dp.toLocaleString()} DP
              {dpDelta !== 0 ? (
                <em data-sign={dpDelta > 0 ? "up" : "down"}>
                  {dpDelta > 0 ? "+" : "−"}
                  {Math.abs(dpDelta).toLocaleString()}
                </em>
              ) : null}
            </span>
          ) : null}
          {suspended ? <span data-state="suspended">{t("overlay.suspended")}</span> : null}
        </div>
        {keywords?.length ? (
          <div className="card-action-sheet__keywords">
            {keywords.map((k) => (
              <span key={k}>{formatKeyword(k)}</span>
            ))}
          </div>
        ) : null}
      </>
    );
    return createPortal(
      <div
        className="card-action-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={def?.nameEn ?? t("game.actions")}
        onClick={onClose}
      >
        <div className="card-action-sheet__panel" onClick={(e) => e.stopPropagation()}>
          <div className="card-action-sheet__grip" aria-hidden />
          <div className="card-action-sheet__body">
            {cardId ? (
              <button
                type="button"
                className="card-action-sheet__zoom"
                onClick={() => setZoomed(cardId)}
                aria-label={t("overlay.zoomCard")}
              >
                <CardFull cardId={cardId} width={190} />
              </button>
            ) : null}
            <div className="card-action-sheet__info">
              {liveInfo}
              <div className="card-action-sheet__actions">
                <Button size="md" full variant="secondary" icon={Icons.Search} onClick={onViewStack}>
                  {t("overlay.viewStack")}
                </Button>
                {canAttack ? (
                  <Button size="md" full variant="danger" icon={Icons.Swords} onClick={onAttack} autoFocus>
                    {t("overlay.attack")}
                  </Button>
                ) : null}
                {canVortex && onVortex ? (
                  <Button size="md" full variant="danger" icon={Icons.Swords} onClick={onVortex}>
                    {t("overlay.vortexAttack")}
                  </Button>
                ) : null}
                {(effects ?? []).map((effect) => (
                  <Button
                    key={effect.label}
                    size="md"
                    full
                    variant="secondary"
                    onClick={effect.onActivate}
                    aria-label={`${t("game.activateEffect")}: ${effect.label}`}
                    title={effect.label}
                  >
                    <span aria-hidden="true">⚡</span>
                    <span>{t("game.activateMainEffect")}</span>
                  </Button>
                ))}
                {promote ? (
                  <Button
                    size="md"
                    full
                    variant="secondary"
                    icon={Icons.ChevronUp}
                    onClick={promote.onPromote}
                    autoFocus={!canAttack}
                  >
                    {promote.label}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  full
                  variant="ghost"
                  onClick={onClose}
                  autoFocus={!canAttack && !canVortex && !promote}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </div>
          {beneath.length ? (
            <div className="card-action-sheet__stack">
              {(["stack", "linked"] as const).map((role) => {
                const group = beneath.filter((c) => c.role === role);
                if (!group.length) return null;
                return (
                  <div key={role}>
                    <span>{t(ROLE_LABEL_KEYS[role])}</span>
                    <div>
                      {group.map((c, i) => (
                        <button type="button" key={`${c.cardId}-${i}`} onClick={() => setZoomed(c.cardId)}>
                          <CardArt cardId={c.cardId} width={54} />
                          <figcaption>{getCardDefinition(c.cardId)?.nameEn ?? c.cardId}</figcaption>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
        {zoomed ? (
          <CardZoomOverlay
            cardId={zoomed}
            details={zoomed === cardId ? liveInfo : undefined}
            onClose={() => setZoomed(null)}
          />
        ) : null}
      </div>,
      document.body,
    );
  }
  const item: React.CSSProperties = {
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

/* ---------------- STACK VIEWER ---------------- */

export interface StackCard {
  cardId: string;
  role: "top" | "stack" | "linked";
}

/** Full-screen blow-up of a single card; tap anywhere (or Escape) to dismiss. */
export function CardZoomOverlay({
  cardId,
  onClose,
  inline,
  details,
}: {
  cardId: string;
  onClose: () => void;
  /** Render in place rather than portalling, so a fixture stage can hold the overlay. */
  inline?: boolean;
  /** Info shown under the card. Defaults to the printed name, level, cost and DP. */
  details?: ReactNode;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const panel = (
    <div
      className="card-zoom"
      role="dialog"
      aria-modal="true"
      aria-label={getCardDefinition(cardId)?.nameEn ?? cardId}
      onClick={onClose}
    >
      <CardFull cardId={cardId} width={340} />
      <div className="card-zoom__details card-action-sheet__info" onClick={(e) => e.stopPropagation()}>
        {details ?? <PrintedCardInfo cardId={cardId} />}
      </div>
      <button type="button" onClick={onClose} autoFocus>
        {t("common.close")}
      </button>
    </div>
  );
  return inline ? panel : createPortal(panel, document.body);
}

/** Name plus the printed level, play cost and DP, styled like the action sheet header. */
export function PrintedCardInfo({ cardId }: { cardId: string }) {
  const { t } = useTranslation();
  const def = getCardDefinition(cardId);
  return (
    <>
      <strong>{def?.nameEn ?? cardId}</strong>
      <div className="card-action-sheet__stats">
        {def?.level ? <span>Lv.{def.level}</span> : null}
        <span>{def && def.playCost >= 0 ? t("game.costsMemory", { count: def.playCost }) : t("game.noCost")}</span>
        {def?.dp ? <span>{def.dp.toLocaleString()} DP</span> : null}
      </div>
    </>
  );
}

/**
 * Turns a synced keyword into its printed spelling. The server normalizes printed
 * keyword icons to a parameterless base name (＜Security Attack +1＞ → "SecurityAttack"),
 * so the numeric parameter is not available here — only the keyword itself.
 */
const ROLE_LABEL_KEYS: Record<StackCard["role"], "overlay.role.top" | "overlay.role.stack" | "overlay.role.linked"> = {
  top: "overlay.role.top",
  stack: "overlay.role.stack",
  linked: "overlay.role.linked",
};

/** Self-contained card art with image fallback to the color Sigil (no hover zoom). */
function CardArt({ cardId, width }: { cardId: string; width: number }) {
  const def = getCardDefinition(cardId);
  const urls = cardImageUrls(def?.imageId ?? cardId);
  const [idx, setIdx] = useState(0);
  const h = Math.round(width * 1.4);
  if (!def) return <CardBack width={width} label={cardId} />;
  if (idx >= urls.length) {
    return (
      <div
        style={{
          width,
          height: h,
          borderRadius: 10,
          background: `radial-gradient(${COLORS[colorKey(def.colors[0])].soft}, var(--ds-surface-muted))`,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Sigil cardId={def.cardId} color={colorKey(def.colors[0])} size={Math.round(h * 0.4)} />
      </div>
    );
  }
  return (
    <img
      src={urls[idx]}
      alt={def.nameEn}
      onError={() => setIdx((i) => i + 1)}
      style={{ width, height: h, borderRadius: 10, objectFit: "cover", objectPosition: "top", flexShrink: 0 }}
    />
  );
}

/** The computed half of the stack viewer: the figures and keywords the server resolved. */
function StackViewerState({ detail, fate }: { detail: PermanentDetail; fate?: PendingFateBadge }) {
  const { t } = useTranslation();
  const granted = new Set(detail.grantedKeywords);
  return (
    <div className="stack-viewer-state">
      <p className="stack-viewer-state__dp">
        <strong>{detail.currentDP.toLocaleString()}</strong> {t("overlay.liveDp")}
        {detail.dpDelta === 0 ? null : (
          <em data-direction={detail.dpDelta > 0 ? "up" : "down"}>
            {detail.dpDelta > 0 ? "+" : "−"}
            {Math.abs(detail.dpDelta).toLocaleString()}
          </em>
        )}
      </p>
      {detail.dpDelta === 0 ? null : (
        <p className="stack-viewer-state__base">
          {t("overlay.baseDp")}: {detail.baseDP.toLocaleString()}
        </p>
      )}
      <ul className="stack-viewer-state__keywords" aria-label={t("overlay.keywords")}>
        {detail.keywords.length === 0 ? <li data-empty="true">{t("overlay.noKeywords")}</li> : null}
        {detail.keywords.map((keyword) => (
          <li key={keyword} data-granted={granted.has(keyword) || undefined}>
            {formatKeyword(keyword)}
            {keyword === "SecurityAttack" && detail.securityAttack !== undefined
              ? ` \u00d7${detail.securityAttack}`
              : ""}
          </li>
        ))}
      </ul>
      {detail.restrictions.length ? (
        <ul className="stack-viewer-state__restrictions" aria-label={t("overlay.restrictions")}>
          {detail.restrictions.map((restriction) => (
            <li key={restriction.kind}>{t(restriction.labelKey)}</li>
          ))}
        </ul>
      ) : null}
      {fate ? (
        <p className="stack-viewer-state__fate" data-tone={fate.tone}>
          <span aria-hidden="true">{fate.glyph}</span>
          {t(fate.labelKey)}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The phone reading of a field permanent: one sheet that runs top to bottom —
 * header, computed state, then a wrapping grid per role — so nothing is cut off
 * sideways. Tapping any card opens the shared zoom overlay rather than pinning a
 * full-width card under the sheet.
 */
function StackViewerSheet({
  cards,
  title,
  detail,
  fate,
  zoomed,
  onZoom,
  canAttack,
  canVortex,
  onAttack,
  onVortex,
  onClose,
}: {
  cards: StackCard[];
  title: string;
  detail?: PermanentDetail;
  fate?: PendingFateBadge;
  zoomed: string | null;
  onZoom: (cardId: string | null) => void;
  canAttack: boolean;
  canVortex?: boolean;
  onAttack: () => void;
  onVortex?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const active = cards.find((c) => c.role === "top") ?? cards[0];
  const def = getCardDefinition(active?.cardId ?? "");
  const dp = detail?.currentDP ?? def?.dp;
  const dpDelta = detail?.dpDelta ?? 0;
  const granted = new Set(detail?.grantedKeywords ?? []);
  const keywords = detail?.keywords ?? [];
  const header = (
    <>
      <strong>{def?.nameEn ?? title}</strong>
      <div className="card-action-sheet__stats">
        {def?.level ? <span>Lv.{def.level}</span> : null}
        {def?.colors?.length ? <span>{def.colors.join(" / ")}</span> : null}
        {dp ? (
          <span>
            {dp.toLocaleString()} DP
            {dpDelta === 0 ? null : (
              <em data-sign={dpDelta > 0 ? "up" : "down"}>
                {dpDelta > 0 ? "+" : "−"}
                {Math.abs(dpDelta).toLocaleString()}
              </em>
            )}
          </span>
        ) : null}
        {detail?.suspended ? <span data-state="suspended">{t("overlay.suspended")}</span> : null}
      </div>
      {keywords.length ? (
        <div className="card-action-sheet__keywords" aria-label={t("overlay.keywords")}>
          {keywords.map((keyword) => (
            <span key={keyword} data-granted={granted.has(keyword) || undefined}>
              {formatKeyword(keyword)}
              {keyword === "SecurityAttack" && detail?.securityAttack !== undefined ? ` ×${detail.securityAttack}` : ""}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
  return createPortal(
    <div className="card-action-sheet stack-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="card-action-sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="card-action-sheet__grip" aria-hidden />
        <div className="card-action-sheet__body">
          {active ? (
            <button
              type="button"
              className="card-action-sheet__zoom"
              onClick={() => onZoom(active.cardId)}
              aria-label={t("overlay.zoomCard")}
            >
              <CardArt cardId={active.cardId} width={140} />
            </button>
          ) : null}
          <div className="card-action-sheet__info">{header}</div>
        </div>
        {detail?.restrictions.length ? (
          <ul className="stack-viewer-state__restrictions" aria-label={t("overlay.restrictions")}>
            {detail.restrictions.map((restriction) => (
              <li key={restriction.kind}>{t(restriction.labelKey)}</li>
            ))}
          </ul>
        ) : null}
        {fate ? (
          <p className="stack-viewer-state__fate" data-tone={fate.tone}>
            <span aria-hidden="true">{fate.glyph}</span>
            {t(fate.labelKey)}
          </p>
        ) : null}
        <div className="stack-sheet__groups">
          {(["top", "stack", "linked"] as const).map((role) => {
            const group = cards.filter((c) => c.role === role);
            if (group.length === 0) return null;
            return (
              <section key={role} aria-label={t(ROLE_LABEL_KEYS[role])}>
                <span>{t(ROLE_LABEL_KEYS[role])}</span>
                <div className="stack-sheet__grid">
                  {group.map((c, i) => (
                    <button type="button" key={`${c.cardId}-${i}`} onClick={() => onZoom(c.cardId)}>
                      <CardArt cardId={c.cardId} width={72} />
                      <figcaption>
                        {role === "stack" ? <b>{i + 1}</b> : null}
                        {getCardDefinition(c.cardId)?.nameEn ?? c.cardId}
                      </figcaption>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <div className="card-action-sheet__actions">
          {canAttack ? (
            <Button size="md" full variant="danger" icon={Icons.Swords} onClick={onAttack}>
              {t("overlay.attack")}
            </Button>
          ) : null}
          {canVortex && onVortex ? (
            <Button size="md" full variant="danger" icon={Icons.Swords} onClick={onVortex}>
              {t("overlay.vortexAttack")}
            </Button>
          ) : null}
          <Button size="sm" full variant="ghost" onClick={onClose} autoFocus={!canAttack && !canVortex}>
            {t("common.close")}
          </Button>
        </div>
      </div>
      {zoomed ? (
        <CardZoomOverlay
          cardId={zoomed}
          details={zoomed === active?.cardId ? header : undefined}
          onClose={() => onZoom(null)}
        />
      ) : null}
    </div>,
    document.body,
  );
}

/**
 * Modal that lays out the cards making up a field permanent: thumbnails on the
 * left (active card, its digivolution stack, then linked cards), and a large
 * preview of the last-hovered thumbnail on the right. Surfaces an "Attack" action
 * when the caller deems the permanent eligible.
 */
export function StackViewerOverlay({
  cards,
  title,
  detail,
  fate,
  sheet,
  canAttack,
  canVortex,
  onAttack,
  onVortex,
  onClose,
}: {
  cards: StackCard[];
  title: string;
  /** The position's computed state: live DP against the printed figure and the resolved keywords. */
  detail?: PermanentDetail;
  /** The badge an open effect has already pinned to this permanent, if any. */
  fate?: PendingFateBadge;
  /**
   * Render as a bottom sheet (touch layouts) instead of the two-column dialog.
   * Defaults to the same phone breakpoint the stylesheet's phone block carries.
   */
  sheet?: boolean;
  canAttack: boolean;
  canVortex?: boolean;
  onAttack: () => void;
  onVortex?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewZoomed, setPreviewZoomed] = useState(false);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const touchLayout = useMediaQuery(TOUCH_LAYOUT_QUERY);
  const preview = (cards[activeIndex] ?? cards[0])?.cardId;
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      // The card zoom sits on top and closes itself on Escape; the sheet under it stays.
      if (event.key === "Escape" && zoomed === null) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, zoomed]);

  if (sheet ?? touchLayout) {
    return (
      <StackViewerSheet
        cards={cards}
        title={title}
        detail={detail}
        fate={fate}
        zoomed={zoomed}
        onZoom={setZoomed}
        canAttack={canAttack}
        canVortex={canVortex}
        onAttack={onAttack}
        onVortex={onVortex}
        onClose={onClose}
      />
    );
  }

  return (
    <Scrim onClick={onClose} className="game-modal">
      <div
        className="trash-viewer-dialog game-modal__panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          gap: 22,
          maxWidth: 820,
          maxHeight: "86%",
          padding: 24,
          background: "var(--ds-surface)",
          borderRadius: 20,
          border: "1px solid var(--ds-border)",
          boxShadow: "var(--ds-shadow-summary)",
        }}
      >
        {/* left: thumbnails grouped by role */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflowY: "auto",
            paddingRight: 4,
            minWidth: 200,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ds-fg)", fontFamily: "var(--ds-font-display)" }}>
            {title}
          </div>
          {detail ? <StackViewerState detail={detail} fate={fate} /> : null}
          {(["top", "stack", "linked"] as const).map((role) => {
            const group = cards.map((c, index) => ({ c, index })).filter(({ c }) => c.role === role);
            if (group.length === 0) return null;
            return (
              <div key={role} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ds-fg-muted)",
                  }}
                >
                  {t(ROLE_LABEL_KEYS[role])}
                </div>
                {group.map(({ c, index }) => {
                  const def = getCardDefinition(c.cardId);
                  const sel = activeIndex === index;
                  return (
                    <button
                      key={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => setActiveIndex(index)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 6,
                        borderRadius: 10,
                        cursor: "pointer",
                        textAlign: "left",
                        background: sel ? "var(--ds-accent-surface)" : "var(--ds-surface-muted)",
                        border: `1.5px solid ${sel ? "var(--ds-accent)" : "transparent"}`,
                        transition: "background 120ms, border-color 120ms",
                      }}
                    >
                      <CardArt cardId={c.cardId} width={42} />
                      <div style={{ overflow: "hidden" }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: "var(--ds-fg)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {def?.nameEn ?? c.cardId}
                        </div>
                        <div style={{ fontFamily: "var(--ds-font-mono)", fontSize: 10.5, color: "var(--ds-fg-muted)" }}>
                          {def?.dp ? `${def.dp.toLocaleString()} DP` : c.cardId}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* right: large preview of the hovered card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {preview ? (
            <div
              onMouseEnter={() => setPreviewZoomed(true)}
              onMouseLeave={() => setPreviewZoomed(false)}
              style={{
                transform: previewZoomed ? "scale(1.35)" : "scale(1)",
                transformOrigin: "center",
                transition: "transform 160ms ease",
                cursor: "zoom-in",
              }}
            >
              <CardArt cardId={preview} width={260} />
            </div>
          ) : null}
          <div className="game-actions-row" style={{ width: "100%" }}>
            {canAttack ? (
              <Button size="md" variant="danger" full icon={Icons.Swords} onClick={onAttack}>
                {t("overlay.attack")}
              </Button>
            ) : null}
            {canVortex && onVortex ? (
              <Button size="md" variant="danger" full icon={Icons.Swords} onClick={onVortex}>
                {t("overlay.vortexAttack")}
              </Button>
            ) : null}
            <Button size="md" variant="ghost" full onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </div>
    </Scrim>
  );
}

/* ---------------- TRASH VIEWER ---------------- */

/**
 * Modal listing every card in a player's trash (public information). Cards are
 * laid out newest-first in a wrapped grid of thumbnails; hovering one shows a
 * large preview on the right. Read-only — the trash stays server-owned.
 */
export function TrashViewerOverlay({
  cardIds,
  title,
  sheet,
  countLabel,
  emptyLabel,
  onClose,
}: {
  cardIds: string[];
  title: string;
  /** Render as a bottom sheet with one scrollable row (touch layouts). */
  sheet?: boolean;
  /** Header count text; defaults to the trash card count. */
  countLabel?: string;
  /** Text shown when `cardIds` is empty; defaults to the trash empty message. */
  emptyLabel?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const countText = countLabel ?? t("overlay.trashCount", { count: cardIds.length });
  const emptyText = emptyLabel ?? t("overlay.trashEmpty");
  const ordered = [...cardIds].reverse();
  const [activeCardId, setActiveCardId] = useState(ordered[0]);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const preview = activeCardId ?? ordered[0];

  if (sheet) {
    return createPortal(
      <div className="card-action-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
        <div className="card-action-sheet__panel" onClick={(e) => e.stopPropagation()}>
          <div className="card-action-sheet__grip" aria-hidden />
          <div className="trash-sheet__header">
            <strong>{title}</strong>
            <span>{countText}</span>
          </div>
          {ordered.length === 0 ? (
            <p className="trash-sheet__empty">{emptyText}</p>
          ) : (
            <div className="trash-sheet__row">
              {ordered.map((cardId, i) => (
                <button type="button" key={`${cardId}-${i}`} onClick={() => setZoomed(cardId)}>
                  <CardArt cardId={cardId} width={96} />
                  <figcaption>{getCardDefinition(cardId)?.nameEn ?? cardId}</figcaption>
                </button>
              ))}
            </div>
          )}
          <div className="card-action-sheet__actions">
            <Button size="sm" full variant="ghost" onClick={onClose} autoFocus>
              {t("common.close")}
            </Button>
          </div>
        </div>
        {zoomed ? <CardZoomOverlay cardId={zoomed} onClose={() => setZoomed(null)} /> : null}
      </div>,
      document.body,
    );
  }

  return (
    <Scrim onClick={onClose} className="game-modal">
      <div
        className="game-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          gap: 22,
          width: 820,
          maxWidth: "92%",
          maxHeight: "86%",
          padding: 24,
          background: "var(--ds-surface)",
          borderRadius: 20,
          border: "1px solid var(--ds-border)",
          boxShadow: "var(--ds-shadow-summary)",
        }}
      >
        {/* left: header + wrapped thumbnail grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ds-fg)", fontFamily: "var(--ds-font-display)" }}>
              {title}
            </div>
            <div style={{ fontFamily: "var(--ds-font-mono)", fontSize: 11, color: "var(--ds-fg-muted)" }}>
              {countText}
            </div>
          </div>
          {ordered.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "grid",
                placeItems: "center",
                color: "var(--ds-fg-disabled)",
                fontFamily: "var(--ds-font-mono)",
                fontSize: 12,
              }}
            >
              {emptyText}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                overflowY: "auto",
                alignContent: "flex-start",
                paddingRight: 4,
              }}
            >
              {ordered.map((cardId, i) => {
                const def = getCardDefinition(cardId);
                const sel = preview === cardId;
                return (
                  <button
                    key={`${cardId}-${i}`}
                    onMouseEnter={() => setActiveCardId(cardId)}
                    onClick={() => setActiveCardId(cardId)}
                    title={def?.nameEn ?? cardId}
                    style={{
                      padding: 3,
                      borderRadius: 9,
                      cursor: "pointer",
                      background: sel ? "var(--ds-accent-surface)" : "transparent",
                      border: `1.5px solid ${sel ? "var(--ds-accent)" : "transparent"}`,
                      transition: "background 120ms, border-color 120ms",
                    }}
                  >
                    <CardArt cardId={cardId} width={64} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* right: large preview of the hovered card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          {preview ? <CardArt cardId={preview} width={260} /> : null}
          <Button size="md" variant="ghost" full onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Scrim>
  );
}

/* ---------------- DIGIXROS MATERIAL PICKER ---------------- */

/** A selectable DigiXros material entry. */
export interface DigiXrosCandidate {
  instanceId: string;
  cardId: string;
  zone: "hand" | "battle" | "trash" | "underTamer";
  digiXrosNames?: readonly string[];
  canSubstitute?: boolean;
}

export interface DigiXrosEligibleExpander {
  permanentId: string;
  cardId: string;
  underTamerMax: number;
  trashMax: number;
}

/** Human-readable label for one DigiXros material slot. */
function materialSlotLabel(mat: DigiXrosRequirement["materials"][number], t: Translate): string {
  if (mat.desc) return mat.desc;
  const parts: string[] = [];
  if (mat.names?.length) parts.push(mat.names.join("/"));
  if (mat.traits?.length) parts.push(`[${mat.traits.join("/")}]`);
  if (mat.traitContains?.length) parts.push(t("overlay.xrosTraitContains", { traits: mat.traitContains.join("/") }));
  if (mat.colors?.length) parts.push(mat.colors.join("/"));
  if (mat.level !== undefined) parts.push(`Lv.${mat.level}`);
  else if (mat.levelMin !== undefined || mat.levelMax !== undefined)
    parts.push(`Lv.${mat.levelMin ?? "?"}–${mat.levelMax ?? "?"}`);
  if (mat.nameOrTrait?.length) parts.push(mat.nameOrTrait.map((r) => r.tokens.join("/")).join(" or "));
  if (mat.differentNames) parts.push(t("overlay.xrosDifferentNames"));
  return parts.length ? parts.join(" ") : t("overlay.xrosAnyCard");
}

/**
 * Overlay shown when the player initiates play of a card with a DigiXros requirement.
 * The player picks material instance ids from unlocked source zones, then confirms.
 * Skipping sends an empty material list (plain play at full cost — server validates).
 * The server is the sole authority on legality; this is best-effort client-side filtering.
 */
export function DigiXrosMaterialOverlay({
  playingCardId,
  requirements,
  candidates,
  lockedCandidates,
  eligibleExpanders,
  intrinsicTrashMax = 0,
  onConfirm,
  onSkip,
  onCancel,
}: {
  /** The card about to be played. */
  playingCardId: string;
  /** DigiXros requirements for the card (at least one entry). */
  requirements: DigiXrosRequirement[];
  /** Eligible material candidates (hand + battle area top cards). */
  candidates: DigiXrosCandidate[];
  /** Material candidates in zones locked behind selected expander Tamers. */
  lockedCandidates: DigiXrosCandidate[];
  /** Unsuspended expander Tamers that can be suspended for this DigiXros play. */
  eligibleExpanders: DigiXrosEligibleExpander[];
  /** Trash capacity granted by the played card itself, without suspending a Tamer. */
  intrinsicTrashMax?: number;
  /** Confirm with the chosen materials and expander Tamers to suspend. */
  onConfirm: (materialInstanceIds: string[], expanderPermanentIds: string[]) => void;
  /** Play the card normally without DigiXros (full cost, no materials). */
  onSkip: () => void;
  /** Cancel: go back without playing. */
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [picks, setPicks] = useState<string[]>([]);
  const [chosenExpanderPermanentIds, setChosenExpanderPermanentIds] = useState<string[]>([]);

  const req = requirements[0]!;
  const reductionLabel =
    req.count === "∞"
      ? req.costReduction !== undefined
        ? t("overlay.xrosReductionPerCard", { count: req.costReduction })
        : t("overlay.xrosReductionVariable")
      : t("overlay.xrosReductionPerPlaced", { count: req.count });

  const slotLabels = req.materials.map((material) => materialSlotLabel(material, t));
  const chosenExpanders = eligibleExpanders.filter((e) => chosenExpanderPermanentIds.includes(e.permanentId));
  const underTamerMax = chosenExpanders.reduce((max, e) => Math.max(max, e.underTamerMax), 0);
  const trashMax = chosenExpanders.reduce((max, e) => Math.max(max, e.trashMax), intrinsicTrashMax);
  const trashCandidates = lockedCandidates.filter((c) => c.zone === "trash");
  const underTamerCandidates = lockedCandidates.filter((c) => c.zone === "underTamer");
  const availableCandidates = [
    ...candidates,
    ...(trashMax > 0 ? trashCandidates : []),
    ...(underTamerMax > 0 ? underTamerCandidates : []),
  ];
  const candidateById = new Map(availableCandidates.map((c) => [c.instanceId, c]));
  const candidateDefinitions = availableCandidates.flatMap((candidate) => {
    const definition = getCardDefinition(candidate.cardId);
    return definition === undefined
      ? []
      : [
          {
            instanceId: candidate.instanceId,
            definition,
            digiXrosNames: candidate.digiXrosNames,
            canSubstitute: candidate.canSubstitute,
          },
        ];
  });
  const eligibleCandidateIds = eligibleDigiXrosCandidateIds(req, candidateDefinitions, picks);
  for (const picked of picks) eligibleCandidateIds.add(picked);
  const pickedTrash = picks.filter((id) => candidateById.get(id)?.zone === "trash").length;
  const pickedUnderTamer = picks.filter((id) => candidateById.get(id)?.zone === "underTamer").length;

  useEffect(() => {
    setPicks((prev) => {
      let nextTrash = 0;
      let nextUnderTamer = 0;
      const next = prev.filter((id) => {
        const zone = lockedCandidates.find((c) => c.instanceId === id)?.zone;
        if (zone === "trash") {
          nextTrash += 1;
          return nextTrash <= trashMax;
        }
        if (zone === "underTamer") {
          nextUnderTamer += 1;
          return nextUnderTamer <= underTamerMax;
        }
        return true;
      });
      return next.length === prev.length ? prev : next;
    });
  }, [lockedCandidates, trashMax, underTamerMax]);

  const toggleExpander = (permanentId: string) => {
    setChosenExpanderPermanentIds((prev) =>
      prev.includes(permanentId) ? prev.filter((id) => id !== permanentId) : [...prev, permanentId],
    );
  };

  const toggle = (candidate: DigiXrosCandidate) => {
    const { instanceId, zone } = candidate;
    setPicks((prev) => {
      if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
      const trashCount = prev.filter((id) => candidateById.get(id)?.zone === "trash").length;
      const underTamerCount = prev.filter((id) => candidateById.get(id)?.zone === "underTamer").length;
      if (zone === "trash" && trashCount >= trashMax) return prev;
      if (zone === "underTamer" && underTamerCount >= underTamerMax) return prev;
      return [...prev, instanceId];
    });
  };

  const zoneLabel = (zone: DigiXrosCandidate["zone"]): string => t(`overlay.zone.${zone}` as const);

  const renderCandidates = (items: DigiXrosCandidate[], emptyText: string) => {
    const eligibleItems = items.filter((candidate) => eligibleCandidateIds.has(candidate.instanceId));
    return eligibleItems.length === 0 ? (
      <div style={{ padding: "14px 0", textAlign: "center", fontSize: 13, color: "var(--ds-fg-disabled)" }}>
        {emptyText}
      </div>
    ) : (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 280, overflowY: "auto" }}>
        {eligibleItems.map((c) => {
          const selected = picks.includes(c.instanceId);
          const def = getCardDefinition(c.cardId);
          const accessibleName = t("overlay.xrosMaterialLabel", {
            name: def?.nameEn ?? c.cardId,
            zone: zoneLabel(c.zone),
          });
          const zoneCount = c.zone === "trash" ? pickedTrash : c.zone === "underTamer" ? pickedUnderTamer : 0;
          const zoneMax = c.zone === "trash" ? trashMax : c.zone === "underTamer" ? underTamerMax : Infinity;
          const disabled = !selected && zoneCount >= zoneMax;
          return (
            <button
              key={c.instanceId}
              onClick={() => !disabled && toggle(c)}
              disabled={disabled}
              aria-label={accessibleName}
              aria-pressed={selected}
              title={accessibleName}
              style={{
                padding: 4,
                borderRadius: 10,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.45 : 1,
                filter: disabled ? "grayscale(0.6)" : "none",
                background: selected ? "var(--ds-accent-surface)" : "var(--ds-surface-muted)",
                border: `2px solid ${selected ? "var(--ds-accent)" : "transparent"}`,
                transition: "background 100ms, border-color 100ms",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <CardArt cardId={c.cardId} width={72} />
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: selected ? "var(--ds-accent)" : "var(--ds-fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {zoneLabel(c.zone)}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderLockedZone = (label: string, items: DigiXrosCandidate[], max: number) => {
    if (items.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: max > 0 ? "var(--ds-accent)" : "var(--ds-fg-muted)",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontFamily: "var(--ds-font-mono)",
              fontSize: 11,
              color: max > 0 ? "var(--ds-accent)" : "var(--ds-fg-muted)",
            }}
          >
            {max > 0 ? t("overlay.xrosZoneMax", { count: max }) : t("overlay.xrosZoneLocked")}
          </div>
        </div>
        {max > 0 ? (
          renderCandidates(items, t("overlay.xrosNoZoneMaterials", { zone: label.toLowerCase() }))
        ) : (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--ds-surface-muted)",
              color: "var(--ds-fg-muted)",
              fontSize: 12.5,
            }}
          >
            {eligibleExpanders.length > 0 ? t("overlay.xrosUnlockHint") : t("overlay.xrosZoneLocked")}
          </div>
        )}
      </div>
    );
  };

  return (
    <Scrim className="game-modal">
      <div
        className="game-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 640,
          width: "100%",
          background: "var(--ds-surface)",
          borderRadius: 20,
          border: "1px solid var(--ds-border)",
          boxShadow: "var(--ds-shadow-summary)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "var(--ds-accent-surface)",
              color: "var(--ds-accent)",
              flexShrink: 0,
            }}
          >
            <Icons.Sparkles size={20} />
          </div>
          <div>
            <div
              id={titleId}
              style={{ fontFamily: "var(--ds-font-display)", fontWeight: 800, fontSize: 18, color: "var(--ds-fg)" }}
            >
              {t("overlay.xrosTitle", { name: name(playingCardId) })}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)", marginTop: 2 }}>
              {t("overlay.xrosDetail", { reduction: reductionLabel })}
              {slotLabels.length > 0 ? t("overlay.xrosAccepted", { slots: slotLabels.join(" × ") }) : null}
            </div>
          </div>
        </div>

        {eligibleExpanders.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ds-fg-muted)",
              }}
            >
              {t("overlay.xrosExpanders")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {eligibleExpanders.map((e) => {
                const chosen = chosenExpanderPermanentIds.includes(e.permanentId);
                const maxParts = [
                  e.trashMax > 0 ? t("overlay.xrosTrashMax", { count: e.trashMax }) : undefined,
                  e.underTamerMax > 0 ? t("overlay.xrosUnderTamersMax", { count: e.underTamerMax }) : undefined,
                ].filter(Boolean);
                return (
                  <button
                    key={e.permanentId}
                    onClick={() => toggleExpander(e.permanentId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "left",
                      background: chosen ? "var(--ds-accent-surface)" : "var(--ds-surface-muted)",
                      border: `1.5px solid ${chosen ? "var(--ds-accent)" : "var(--ds-border)"}`,
                    }}
                  >
                    <span
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: chosen ? "var(--ds-accent)" : "var(--ds-border)",
                        color: chosen ? "#fff" : "var(--ds-fg-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {chosen ? <Icons.Check size={14} /> : null}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: "var(--ds-fg)" }}>
                      {t("overlay.xrosSuspendToUnlock", {
                        name: name(e.cardId),
                        limits: maxParts.length ? t("overlay.xrosLimits", { limits: maxParts.join(", ") }) : "",
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {renderCandidates(candidates, t("overlay.xrosNoMaterials"))}
        {renderLockedZone(t("overlay.xrosZoneTrash"), trashCandidates, trashMax)}
        {renderLockedZone(t("overlay.xrosZoneUnderTamers"), underTamerCandidates, underTamerMax)}

        <div style={{ fontSize: 12, color: "var(--ds-fg-muted)" }}>
          {picks.length === 0 ? t("overlay.xrosNoneSelected") : t("overlay.xrosSelected", { count: picks.length })}
        </div>

        {/* actions */}
        <div className="game-actions-row">
          <Button
            full
            icon={Icons.Sparkles}
            disabled={picks.length === 0}
            onClick={() => onConfirm(picks, chosenExpanderPermanentIds)}
          >
            {picks.length === 1 ? t("overlay.xrosConfirmOne") : t("overlay.xrosConfirm", { count: picks.length })}
          </Button>
          <Button full variant="secondary" onClick={onSkip}>
            {t("overlay.xrosPlayWithout")}
          </Button>
          <Button full variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </Scrim>
  );
}
