import { EffectText } from "./EffectText";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getCardDefinition } from "@aegis/shared";
import { CardBack, CardFull } from "../design/cards";
import { Icons } from "../design/icons";
import { COLORS, colorKey } from "../design/theme";
import { useTranslation } from "../i18n";
import { groupedInspectorEvolutionCosts, inspectorCardsTopToBottom, inspectedArenaHalf } from "./arenaInspectorModel";
import { formatResolvedKeyword } from "./keywordDisplay";
import type { CardInspectionDetail } from "./permanentDetail";
import type { PendingFateBadge } from "./pendingFate";
import { Side } from "./side";
import "./arenaPermanentInspector.css";

export interface ArenaInspectionOptions {
  side: Side;
  container: HTMLElement | null;
  returnFocusTo?: HTMLElement | null;
}

/** The shared field-card detail, laid across the half opposite the selected card. */
export function ArenaPermanentInspector({
  detail,
  inspection,
  fate,
  actions,
  zoomed = false,
  onZoom,
  onClose,
}: {
  detail: CardInspectionDetail;
  inspection: ArenaInspectionOptions;
  fate?: PendingFateBadge;
  actions?: ReactNode;
  zoomed?: boolean;
  onZoom: (cardId: string, artId?: string) => void;
  onClose: () => void;
}) {
  const { locale, t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const top = getCardDefinition(detail.cardId);
  const supporting = inspectorCardsTopToBottom(detail.cards).filter((card) => card.role !== "top");
  const traits = [top?.forms?.[0], top?.attributes?.[0], top?.types?.[0]].filter((trait) => trait && trait !== "-");

  useEffect(() => {
    const origin =
      inspection.returnFocusTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    closeRef.current?.focus();
    return () => {
      if (
        origin?.isConnected &&
        (panelRef.current?.contains(document.activeElement) || document.activeElement === document.body)
      )
        origin.focus();
    };
  }, [inspection.returnFocusTo]);

  useEffect(() => {
    if (zoomed) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeCallback.current();
    };
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) closeCallback.current();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside, true);
    };
  }, [zoomed]);

  const panel = (
    <section
      ref={panelRef}
      className="arena-permanent-inspector"
      data-half={inspectedArenaHalf(inspection.side)}
      data-card-side={inspection.side}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <div className="arena-permanent-inspector__body">
        <button
          type="button"
          className="arena-permanent-inspector__art"
          onClick={() => onZoom(detail.cardId, detail.artId)}
          aria-label={t("overlay.zoomCard")}
        >
          <CardFull cardId={detail.cardId} artId={detail.artId} width={190} zoomOnHover={false} />
        </button>
        <div className="arena-permanent-inspector__reading">
          <header className="arena-permanent-inspector__header">
            <div className="arena-permanent-inspector__title">
              <h2 id={titleId}>{detail.name}</h2>
              {top?.level ? <span>Lv.{top.level}</span> : null}
            </div>
            {detail.currentDP > 0 ? (
              <strong className="arena-permanent-inspector__dp">
                {detail.currentDP.toLocaleString()} DP
                {detail.dpDelta ? (
                  <em data-direction={detail.dpDelta > 0 ? "up" : "down"}>
                    {detail.dpDelta > 0 ? "+" : "−"}
                    {Math.abs(detail.dpDelta).toLocaleString()}
                  </em>
                ) : null}
              </strong>
            ) : null}
            <button
              ref={closeRef}
              type="button"
              className="arena-permanent-inspector__close"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <span aria-hidden="true">
                <Icons.X size={20} />
              </span>
            </button>
          </header>
          <div className="arena-permanent-inspector__stats">
            <span>{detail.cardId}</span>
            {top && top.playCost >= 0 ? <span>{t("game.costsMemory", { count: top.playCost })}</span> : null}
            {groupedInspectorEvolutionCosts(top?.evoCosts ?? []).map((cost) => {
              const colorsByLabel = new Map(cost.colors.map((color) => [t(`game.color.${color}`), color]));
              return (
                <span key={`${cost.level}-${cost.memoryCost}`} className="arena-permanent-inspector__evolution">
                  <span>
                    {t("overlay.digivolveCost")} {cost.memoryCost} · Lv.{cost.level}
                    {" · "}
                  </span>
                  <span className="arena-permanent-inspector__colors">
                    {new Intl.ListFormat(locale, { type: "disjunction" })
                      .formatToParts([...colorsByLabel.keys()])
                      .map((part, index) =>
                        part.type === "element" ? (
                          <span
                            key={index}
                            className="arena-permanent-inspector__color"
                            data-color={colorsByLabel.get(part.value)}
                          >
                            <i
                              aria-hidden="true"
                              style={{ background: COLORS[colorKey(colorsByLabel.get(part.value)!)].base }}
                            />
                            <span>{part.value}</span>
                          </span>
                        ) : (
                          <span key={index}>{part.value}</span>
                        ),
                      )}
                  </span>
                </span>
              );
            })}
            {traits.length ? <span className="arena-permanent-inspector__traits">{traits.join(" / ")}</span> : null}
          </div>
          <div
            className="arena-permanent-inspector__state"
            role={detail.keywords.length ? "region" : undefined}
            aria-label={detail.keywords.length ? t("game.activeKeywords") : undefined}
            tabIndex={0}
          >
            {detail.keywords.map((keyword) => (
              <span key={keyword} data-granted={detail.grantedKeywords.includes(keyword) || undefined}>
                {formatResolvedKeyword(keyword, detail.securityAttackModifier, detail.keywordLabels?.[keyword])}
              </span>
            ))}
            {detail.suspended ? <span>{t("overlay.suspended")}</span> : null}
            {detail.restrictions.map((restriction) => (
              <span
                key={restriction.kind}
                data-warning={restriction.protection ? undefined : "true"}
                data-protection={restriction.protection || undefined}
              >
                {restriction.protection ? <Icons.ShieldCheck size={12} /> : null}
                {t(restriction.labelKey)}
              </span>
            ))}
            {detail.dpDelta ? (
              <span>
                {t("overlay.baseDp")}: {detail.baseDP.toLocaleString()}
              </span>
            ) : null}
            {detail.transformation ? (
              <span data-warning="true">{t("overlay.transformedBadge", { name: detail.transformation.name })}</span>
            ) : null}
            {fate ? <span data-warning="true">{t(fate.labelKey)}</span> : null}
          </div>
          <div
            className="arena-permanent-inspector__effects"
            role="region"
            aria-label={t("overlay.printedEffect")}
            tabIndex={0}
          >
            {detail.transformation ? (
              <div className="arena-permanent-inspector__effect" data-role="transformed">
                <span className="arena-permanent-inspector__effect-label">{t("overlay.transformedLabel")}</span>
                <p>
                  {t(
                    detail.transformation.colors.length
                      ? "overlay.transformedSummary"
                      : "overlay.transformedSummaryNoColor",
                    {
                      name: detail.transformation.name,
                      color: detail.transformation.colors.map((color) => t(`game.color.${color}`)).join(" / "),
                      dp: detail.transformation.dp.toLocaleString(),
                    },
                  )}
                </p>
                <p>{t("overlay.transformedRules")}</p>
              </div>
            ) : null}
            {top?.effectText || supporting.length === 0 ? (
              <div className="arena-permanent-inspector__effect" data-role="top">
                <span className="arena-permanent-inspector__effect-label">{t("overlay.printedEffect")}</span>
                <p>
                  <EffectText text={top?.effectText || t("overlay.noPrintedEffect")} />
                </p>
              </div>
            ) : null}
            {top?.optionEffect ? (
              <div className="arena-permanent-inspector__effect" data-role="printed-option">
                <span className="arena-permanent-inspector__effect-label">
                  {t("library.optionEffect")}
                  {top.dualEffect ? ` · ${top.dualEffect}` : ""}
                </span>
                <p>
                  <EffectText text={top.optionEffect} />
                </p>
              </div>
            ) : null}
            {detail.printedOnly
              ? [
                  { role: "printed-inherited", label: t("library.inheritedEffect"), text: top?.inheritedEffectText },
                  { role: "printed-linked", label: t("overlay.role.linked"), text: top?.linkEffect },
                  { role: "printed-security", label: t("library.securityEffect"), text: top?.securityEffectText },
                ]
                  .filter((effect) => effect.text)
                  .map((effect) => (
                    <div key={effect.role} className="arena-permanent-inspector__effect" data-role={effect.role}>
                      <span className="arena-permanent-inspector__effect-label">{effect.label}</span>
                      <p>
                        <EffectText text={effect.text!} />
                      </p>
                    </div>
                  ))
              : null}
            {supporting.map((card, index) => {
              if (card.faceDown || !card.cardId)
                return (
                  <div
                    key={`hidden-${index}`}
                    className="arena-permanent-inspector__effect arena-permanent-inspector__effect--source"
                    data-role={card.role}
                  >
                    <CardBack width={34} />
                    <span>{t("game.hiddenCard")}</span>
                  </div>
                );
              const definition = getCardDefinition(card.cardId);
              const effect = card.role === "linked" ? definition?.linkEffect : definition?.inheritedEffectText;
              return (
                <div
                  key={`${card.cardId}-${index}`}
                  className="arena-permanent-inspector__effect arena-permanent-inspector__effect--source"
                  data-role={card.role}
                  data-card-id={card.cardId}
                >
                  <button
                    type="button"
                    className="arena-permanent-inspector__source"
                    onClick={() => onZoom(card.cardId, card.artId)}
                    aria-label={t("feed.openCard", { card: definition?.nameEn ?? card.cardId })}
                  >
                    <CardFull cardId={card.cardId} artId={card.artId} width={34} zoomOnHover={false} />
                  </button>
                  <div>
                    <span className="arena-permanent-inspector__effect-label">
                      {definition?.nameEn ?? card.cardId} ·{" "}
                      {t(card.role === "linked" ? "overlay.role.linked" : "overlay.role.inherited")}
                    </span>
                    <p>
                      <EffectText text={effect || t("overlay.noPrintedEffect")} />
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {actions ? <div className="arena-permanent-inspector__actions">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
  return createPortal(panel, inspection.container ?? document.body);
}
