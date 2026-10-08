import type { CSSProperties, ReactNode } from "react";
import { deckLegality, getCardDefinition, formatRestrictionLabel, deckFormat, type DeckFormat } from "@aegis/shared";
import { Badge } from "../design/primitives";
import { CoverThumb } from "../design/cards";
import { COLORS } from "../design/theme";
import { Icons } from "../design/icons";
import { displayCoverCard, displayCoverArt, type DeckListing } from "../game/decks";
import { useTranslation } from "../i18n";
import "./deckListCard.css";

export function DeckListCard({
  deck,
  format: selectedFormat,
  active,
  disabled = false,
  onSelect,
  subtitle,
  actions,
}: {
  deck: DeckListing;
  format?: DeckFormat;
  active: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  const color = COLORS[deck.color];
  const format = deckFormat(selectedFormat ?? deck.format);
  const { banViolations, pairViolations, formatViolations } = deckLegality(deck, { format });

  return (
    <article
      className={`deck-list-card is-compact${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}`}
      style={{ "--deck-color": color.base, "--deck-color-soft": color.soft } as CSSProperties}
    >
      {onSelect ? (
        <button
          type="button"
          className="deck-list-card__selector"
          aria-label={deck.name}
          aria-pressed={active}
          disabled={disabled}
          onClick={onSelect}
        />
      ) : null}
      <div
        className="deck-list-card__cover"
        style={{ background: `linear-gradient(160deg, ${color.soft}, var(--ds-fill))` }}
      >
        <CoverThumb
          key={displayCoverCard(deck)}
          coverCardId={displayCoverCard(deck)}
          artId={displayCoverArt(deck)}
          sigilColor={deck.color}
          sigilSize={64}
        />
      </div>
      <div className="deck-list-card__body">
        <div className="deck-list-card__heading">
          <div className="deck-list-card__identity">
            <span className="deck-list-card__eyebrow">{t("deck.cardEyebrow")}</span>
            <div className="deck-list-card__name-row">
              <h3>{deck.name}</h3>
            </div>
            {subtitle ? <span className="deck-list-card__subtitle">{subtitle}</span> : null}
          </div>
          {active ? (
            <Badge tone="primary">
              <Icons.Check size={12} />
              {t("deck.active")}
            </Badge>
          ) : null}
        </div>
        {deck.format && deck.format !== "standard" ? (
          <Badge>
            {deck.format === "pauper"
              ? t("deckFormat.pauper")
              : deck.format === "unlimited"
                ? t("lobby.unlimited")
                : deck.format}
          </Badge>
        ) : null}
        {formatViolations.length > 0 ? (
          <div className="deck-list-card__violation">
            {t("deckFormat.violations", { count: formatViolations.length })}
          </div>
        ) : null}
        {banViolations.length > 0 ? (
          <div className="deck-list-card__violation">
            {banViolations.map(([id]) => (
              <span key={id}>
                {getCardDefinition(id)?.nameEn ?? id} ({formatRestrictionLabel(id, format)}){" "}
              </span>
            ))}
          </div>
        ) : null}
        {pairViolations.length > 0 ? (
          <div className="deck-list-card__pair-violation">
            <strong>{t("deck.pairTitle")}</strong>
            {pairViolations.map(([a, b]) => (
              <div key={`${a}-${b}`}>
                {t("deck.pairRow", { a: getCardDefinition(a)?.nameEn ?? a, b: getCardDefinition(b)?.nameEn ?? b })}
              </div>
            ))}
          </div>
        ) : null}
        {actions ? <div className="deck-list-card__actions">{actions}</div> : null}
      </div>
    </article>
  );
}
