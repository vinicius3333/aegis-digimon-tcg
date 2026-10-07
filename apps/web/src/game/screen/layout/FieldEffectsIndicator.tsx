import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EffectDuration, getCardDefinition, type FieldEffectView, type Seat } from "@aegis/shared";
import { Layers, Clock } from "lucide-react";
import { useTranslation, type TranslationKey } from "../../../i18n";
import "./fieldEffects.css";

export function readFieldEffects(json: string | undefined): FieldEffectView[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (entry): entry is FieldEffectView =>
        entry !== null &&
        typeof entry === "object" &&
        ["dp", "restriction", "keyword"].includes(entry.kind) &&
        (typeof entry.value === "number" || typeof entry.value === "string") &&
        typeof entry.duration === "number",
    );
  } catch {
    return [];
  }
}

const restrictionLabels: Record<string, TranslationKey> = {
  attack: "game.restriction.cannotAttack",
  block: "game.restriction.cannotBlock",
  suspend: "game.restriction.cannotSuspend",
  beSuspended: "game.restriction.cannotSuspend",
  unsuspend: "game.restriction.cannotUnsuspend",
  digivolve: "game.restriction.cannotDigivolve",
  dpImmune: "game.restriction.protectedFromDpReduction",
  beAffected: "game.restriction.immuneToOpponentEffects",
  beDeleted: "game.restriction.protectedFromEffectDeletion",
  beReturned: "game.restriction.protectedFromEffectReturn",
};

export function FieldEffectsIndicator({
  json,
  ownField,
  playerNames,
}: {
  json: string | undefined;
  ownField: boolean;
  playerNames: readonly [string, string];
}) {
  const { t } = useTranslation();
  const effects = readFieldEffects(json);
  const anchor = useRef<HTMLSpanElement>(null);
  const [corner, setCorner] = useState<{ right: number; top: number }>();
  useLayoutEffect(() => {
    const field = anchor.current?.closest(".game-field");
    const row = field?.querySelector(ownField ? ".game-battle-row--you" : ".game-battle-row--opp");
    if (!row || !field) return;
    function measure() {
      const bounds = row!.getBoundingClientRect();
      const visible = field!.getBoundingClientRect();
      // The outer edge is outside the cards and their paging controls. A portal
      // keeps the touch target clear of row clipping without reserving lane space.
      const compact = window.matchMedia("(max-width: 959px)").matches;
      const top = compact
        ? ownField
          ? bounds.bottom - 30
          : bounds.top - 28
        : ownField
          ? bounds.bottom - 48
          : bounds.top + 4;
      const next =
        top >= visible.top && top + 44 <= visible.bottom
          ? { right: Math.max(8, window.innerWidth - Math.min(bounds.right, visible.right) + 4), top }
          : undefined;
      setCorner((previous) => (previous?.right === next?.right && previous?.top === next?.top ? previous : next));
    }
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(row);
    observer?.observe(field);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [ownField, effects.length]);
  const title = t(ownField ? "game.fieldEffects.yours" : "game.fieldEffects.opponent");
  function label(effect: FieldEffectView): string {
    if (effect.kind === "dp")
      return `DP ${Number(effect.value) >= 0 ? "+" : "−"}${Math.abs(Number(effect.value)).toLocaleString()}`;
    if (effect.kind === "restriction")
      return t(restrictionLabels[String(effect.value)] ?? "game.fieldEffects.restriction");
    return `${effect.value}${effect.amount === undefined ? "" : ` ${effect.amount >= 0 ? "+" : "−"}${Math.abs(effect.amount)}`}`;
  }
  function duration(effect: FieldEffectView): string {
    if (effect.continuous || effect.duration === EffectDuration.Permanent) return t("game.fieldEffects.whileActive");
    const owner = effect.ownerSeat === 1 ? 1 : 0;
    if (
      effect.duration === EffectDuration.UntilOpponentTurnEnd ||
      effect.duration === EffectDuration.UntilOwnerTurnEnd
    ) {
      const seat: Seat = effect.duration === EffectDuration.UntilOpponentTurnEnd ? (owner === 0 ? 1 : 0) : owner;
      return t(
        effect.skipsCurrentOpponentTurnEnd
          ? "game.fieldEffects.untilPlayerNextTurnEnd"
          : "game.fieldEffects.untilPlayerTurnEnd",
        { player: playerNames[seat] },
      );
    }
    if (effect.duration === EffectDuration.UntilEndAttack) return t("game.fieldEffects.untilAttackEnd");
    if (effect.duration === EffectDuration.UntilEndBattle) return t("game.fieldEffects.untilBattleEnd");
    if (effect.duration === EffectDuration.UntilNextUntap || effect.duration === EffectDuration.UntilOwnerActivePhase) {
      return t("game.fieldEffects.untilActivePhase", { player: playerNames[owner] });
    }
    if (effect.duration === EffectDuration.UntilCalculateFixedCost) return t("game.fieldEffects.untilCost");
    return t("game.fieldEffects.untilTurnEnd");
  }
  const summary = effects.length === 1 ? label(effects[0]!) : t("game.fieldEffects.count", { count: effects.length });
  const harmful = effects.some(
    (effect) => effect.kind === "restriction" || (effect.kind === "dp" && Number(effect.value) < 0),
  );
  if (effects.length === 0) return null;
  const badge = (
    <details
      className={`game-field-effects${harmful ? " game-field-effects--warning" : ""}${ownField ? " game-field-effects--own" : ""}`}
      style={{ position: "fixed", ...corner }}
    >
      <summary aria-label={`${title}: ${summary}`}>
        <span className="game-field-effects__chip">
          <Layers size={15} aria-hidden="true" />
          <span key={json} className="game-field-effects__count" aria-hidden="true">
            {effects.length}
          </span>
        </span>
      </summary>
      <ul className="game-field-effects__list" aria-label={title}>
        <li className="game-field-effects__heading">
          <strong>{title}</strong>
          {effects.length > 1 ? <span>{t("game.fieldEffects.count", { count: effects.length })}</span> : null}
        </li>
        {effects.map((effect, index) => (
          <li key={`${effect.sourceCardId}-${effect.kind}-${index}`}>
            <strong>{label(effect)}</strong>
            {effect.sourceCardId ? (
              <span className="game-field-effects__source">
                {getCardDefinition(effect.sourceCardId)?.nameEn ?? effect.sourceCardId} · {effect.sourceCardId}
              </span>
            ) : null}
            {effect.effectText ? <p>{effect.effectText}</p> : null}
            <small>
              <Clock size={12} aria-hidden="true" />
              {duration(effect)}
            </small>
          </li>
        ))}
      </ul>
    </details>
  );
  return (
    <>
      <span ref={anchor} hidden />
      {corner ? createPortal(badge, document.body) : null}
    </>
  );
}
