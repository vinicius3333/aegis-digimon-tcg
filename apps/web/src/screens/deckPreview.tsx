import {
  effectiveCopyLimit as banlistLimit,
  getCardDefinition,
  getCardArts,
  isBanned,
  restrictionLabel,
} from "@aegis/shared";
import { CardFull } from "../design/cards";
import { ColorDot } from "../design/primitives";
import { colorKey, kindOf } from "../design/theme";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { sortCardIds } from "./cardSorting";
import "./deckBuilder.css";

type CountMap = Record<string, number>;

interface DeckPreviewSectionsProps {
  arts?: Record<string, string[]>;
  onEditArt?: (cardId: string, copy: number) => void;
  main: CountMap;
  egg: CountMap;
  coverCardId?: string;
  pairConflictCardIds?: ReadonlySet<string>;
  onSetCover?: (cardId: string) => void;
  onAdd: (cardId: string) => void;
  onRemove: (cardId: string) => void;
}

interface DeckSection {
  id: string;
  label: string;
  cardIds: string[];
}

function countCards(cards: CountMap): number {
  return Object.values(cards).reduce((sum, count) => sum + count, 0);
}

/** Current-deck preview, arranged around how a player builds an evolution line. */
export function DeckPreviewSections({
  main,
  egg,
  arts,
  onEditArt,
  coverCardId,
  pairConflictCardIds = new Set<string>(),
  onSetCover,
  onAdd,
  onRemove,
}: DeckPreviewSectionsProps) {
  const { t } = useTranslation();
  const byLevel = new Map<number, string[]>();
  const tamers: string[] = [];
  const options: string[] = [];
  const other: string[] = [];

  for (const cardId of Object.keys(main)) {
    const definition = getCardDefinition(cardId);
    if (!definition) {
      other.push(cardId);
      continue;
    }
    const kind = kindOf(definition);
    if (kind === "Tamer") tamers.push(cardId);
    else if (kind === "Option") options.push(cardId);
    else if (kind === "Digimon" && definition.level != null) {
      const cards = byLevel.get(definition.level) ?? [];
      cards.push(cardId);
      byLevel.set(definition.level, cards);
    } else other.push(cardId);
  }

  const eggCardIds = sortCardIds(Object.keys(egg));
  const sections: DeckSection[] = [
    ...[...byLevel.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, cardIds]) => ({
        id: `level-${level}`,
        label: t("deck.levelSection", { level, count: countCardsFromIds(main, cardIds) }),
        cardIds: sortCardIds(cardIds),
      })),
    {
      id: "tamers",
      label: t("deck.tamerSection", { count: countCardsFromIds(main, tamers) }),
      cardIds: sortCardIds(tamers),
    },
    {
      id: "options",
      label: t("deck.optionSection", { count: countCardsFromIds(main, options) }),
      cardIds: sortCardIds(options),
    },
    {
      id: "other",
      label: t("deck.otherSection", { count: countCardsFromIds(main, other) }),
      cardIds: sortCardIds(other),
    },
  ].filter((section) => section.cardIds.length > 0);

  return (
    <div className="deck-preview">
      <section>
        <DeckPreviewLabel>{t("deck.eggSection", { count: countCards(egg) })}</DeckPreviewLabel>
        {eggCardIds.length === 0 ? (
          <DeckPreviewEmpty>{t("deck.noEggs")}</DeckPreviewEmpty>
        ) : (
          <div className="deck-preview__list">
            {eggCardIds.map((cardId) => (
              <DeckPreviewCard
                key={cardId}
                cardId={cardId}
                arts={arts?.[cardId]}
                onEditArt={onEditArt ? (copy) => onEditArt(cardId, copy) : undefined}
                count={egg[cardId]!}
                isCover={coverCardId === cardId}
                pairConflict={pairConflictCardIds.has(cardId)}
                onSetCover={onSetCover ? () => onSetCover(cardId) : undefined}
                onAdd={() => onAdd(cardId)}
                onRemove={() => onRemove(cardId)}
              />
            ))}
          </div>
        )}
      </section>
      {sections.map((section) => (
        <section key={section.id}>
          <DeckPreviewLabel>{section.label}</DeckPreviewLabel>
          <div className="deck-preview__list">
            {section.cardIds.map((cardId) => (
              <DeckPreviewCard
                key={cardId}
                cardId={cardId}
                arts={arts?.[cardId]}
                onEditArt={onEditArt ? (copy) => onEditArt(cardId, copy) : undefined}
                count={(section.id === "eggs" ? egg : main)[cardId]!}
                isCover={coverCardId === cardId}
                pairConflict={pairConflictCardIds.has(cardId)}
                onSetCover={onSetCover ? () => onSetCover(cardId) : undefined}
                onAdd={() => onAdd(cardId)}
                onRemove={() => onRemove(cardId)}
              />
            ))}
          </div>
        </section>
      ))}
      {sections.length === 0 ? <DeckPreviewEmpty>{t("deck.addFromPool")}</DeckPreviewEmpty> : null}
    </div>
  );
}

function countCardsFromIds(cards: CountMap, cardIds: readonly string[]): number {
  return cardIds.reduce((sum, cardId) => sum + (cards[cardId] ?? 0), 0);
}

function DeckPreviewLabel({ children }: { children: React.ReactNode }) {
  return <div className="deck-preview__label">{children}</div>;
}

function DeckPreviewEmpty({ children }: { children: React.ReactNode }) {
  return <div className="deck-preview__empty">{children}</div>;
}

function DeckPreviewCard({
  cardId,
  arts,
  onEditArt,
  count,
  isCover,
  pairConflict,
  onSetCover,
  onAdd,
  onRemove,
}: {
  cardId: string;
  arts?: string[];
  onEditArt?: (copy: number) => void;
  count: number;
  isCover: boolean;
  pairConflict: boolean;
  onSetCover?: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const definition = getCardDefinition(cardId);
  if (!definition) return null;
  const kind = kindOf(definition);
  const cap = Math.min(definition.maxCountInDeck, banlistLimit(cardId));
  const banLabel = pairConflict ? t("deck.pairBadge") : restrictionLabel(cardId);
  const disabled = isBanned(cardId) || pairConflict;
  const typeLabel = kind === "Digimon" && definition.level != null ? `Lv. ${definition.level}` : kind;
  const StarIcon = isCover ? Icons.Star : Icons.StarOutline;

  return (
    <div className="deck-preview-card">
      <div className="deck-preview-card__art">
        <CardFull cardId={cardId} artId={arts?.[0]} width={38} />
      </div>
      <div className="deck-preview-card__body">
        <div className="deck-preview-card__name">
          <ColorDot color={colorKey(definition.colors[0])} size={8} />
          <span>{definition.nameEn}</span>
        </div>
        <div className="deck-preview-card__tags">
          <span className="deck-tag">{typeLabel}</span>
          {banLabel ? (
            <span className="deck-tag" data-tone={disabled ? "danger" : "warning"}>
              {banLabel}
            </span>
          ) : null}
        </div>
        {onEditArt && getCardArts(cardId).length > 1 ? (
          <button
            type="button"
            className="deck-choose-art"
            aria-label={`${definition.nameEn} · ${t("deck.editArtwork")}`}
            onClick={() => onEditArt(0)}
          >
            {t("deck.editArtwork")}
          </button>
        ) : null}
      </div>
      <div className="deck-preview-card__stepper">
        {onSetCover ? (
          <button
            onClick={onSetCover}
            aria-label={isCover ? t("deck.coverCard") : t("deck.setAsCover")}
            title={isCover ? t("deck.coverCard") : t("deck.setAsCover")}
            className="deck-step-button deck-step-button--cover"
            data-cover={isCover}
          >
            <StarIcon size={11} />
          </button>
        ) : null}
        <button onClick={onRemove} aria-label={t("common.remove")} className="deck-step-button">
          –
        </button>
        <span className="deck-preview-card__count">{count}</span>
        <button
          onClick={onAdd}
          aria-label={t("common.add")}
          disabled={disabled || count >= cap}
          className="deck-step-button"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Evolution curve: only Digimon are represented, never play cost. */
export function DeckLevelCurve({ main }: { main: CountMap }) {
  const { t } = useTranslation();
  const counts = new Map<number, number>();
  for (const [cardId, count] of Object.entries(main)) {
    const definition = getCardDefinition(cardId);
    if (!definition || kindOf(definition) !== "Digimon" || definition.level == null) continue;
    counts.set(definition.level, (counts.get(definition.level) ?? 0) + count);
  }
  const levels = [...new Set([2, 3, 4, 5, 6, 7, ...counts.keys()])].sort((a, b) => a - b);
  const peak = Math.max(1, ...counts.values());

  return (
    <div>
      <div className="deck-stat-label">{t("deck.levelCurve")}</div>
      <div className="deck-level-curve">
        {levels.map((level) => {
          const count = counts.get(level) ?? 0;
          return (
            <div key={level} className="deck-level-curve__column">
              <span>{count || ""}</span>
              <div
                className="deck-level-curve__bar"
                data-empty={count === 0}
                style={{ height: `${(count / peak) * 52}px` }}
              />
              <span>Lv.{level}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
