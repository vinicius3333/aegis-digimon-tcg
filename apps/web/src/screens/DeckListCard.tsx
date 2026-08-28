import type { ReactNode } from "react";
import {
  bannedPairViolations,
  effectiveCopyLimit as banlistLimit,
  getCardDefinition,
  restrictionLabel,
} from "@aegis/shared";
import { Badge, ColorDot } from "../design/primitives";
import { CoverThumb } from "../design/cards";
import { COLORS } from "../design/theme";
import { Icons } from "../design/icons";
import { deckBlurbLabel, displayCoverCard, type DeckListing } from "../game/decks";
import { useTranslation } from "../i18n";
import "./deckListCard.css";

const MAIN_TARGET = 50;
const EGG_TARGET = 5;

export interface DeckLegality {
  legal: boolean;
  banViolations: [string, number][];
  pairViolations: [string, string][];
}

export function deckLegality(deck: DeckListing): DeckLegality {
  const counts = new Map<string, number>();
  for (const id of [...deck.mainDeck, ...deck.eggDeck]) counts.set(id, (counts.get(id) ?? 0) + 1);
  const banViolations = [...counts.entries()].filter(([id, count]) => count > banlistLimit(id));
  const pairViolations = bannedPairViolations([...deck.mainDeck, ...deck.eggDeck]);
  return {
    legal:
      deck.mainDeck.length === MAIN_TARGET &&
      deck.eggDeck.length <= EGG_TARGET &&
      banViolations.length === 0 &&
      pairViolations.length === 0,
    banViolations,
    pairViolations,
  };
}

export function DeckListCard({
  deck,
  active,
  compact = false,
  onSelect,
  actions,
}: {
  deck: DeckListing;
  active: boolean;
  compact?: boolean;
  onSelect?: () => void;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  const color = COLORS[deck.color];
  const { legal, banViolations, pairViolations } = deckLegality(deck);

  return (
    <article className={`deck-list-card${compact ? " is-compact" : ""}${active ? " is-active" : ""}`}>
      {onSelect ? (
        <button
          type="button"
          className="deck-list-card__selector"
          aria-label={deck.name}
          aria-pressed={active}
          onClick={onSelect}
        />
      ) : null}
      <div
        className="deck-list-card__cover"
        style={{ background: `linear-gradient(160deg, ${color.soft}, var(--ds-surface-muted))` }}
      >
        <CoverThumb
          key={displayCoverCard(deck)}
          coverCardId={displayCoverCard(deck)}
          sigilColor={deck.color}
          sigilSize={64}
        />
      </div>
      <div className="deck-list-card__body">
        <div className="deck-list-card__heading">
          <div className="deck-list-card__identity">
            <h3>{deck.name}</h3>
            <div className="deck-list-card__counts">
              <ColorDot color={deck.color} size={9} />
              <span className={legal ? "is-legal" : undefined}>
                {deck.mainDeck.length} + {deck.eggDeck.length}
                {legal ? t("deck.legal") : t("deck.draft")}
              </span>
            </div>
          </div>
          {active ? (
            <Badge tone="primary">
              <Icons.Check size={12} />
              {t("deck.active")}
            </Badge>
          ) : null}
        </div>
        <p className="deck-list-card__blurb">{deckBlurbLabel(t, deck.blurb)}</p>
        {banViolations.length > 0 ? (
          <div className="deck-list-card__violation">
            {banViolations.map(([id]) => (
              <span key={id}>
                {getCardDefinition(id)?.nameEn ?? id} ({restrictionLabel(id)}){" "}
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
