import {
  formatCopyLimit,
  getCardDefinition,
  formatCardViolation,
  formatRestrictionLabel,
  type DeckFormat,
} from "@aegis/shared";
import { CardFull } from "../design/cards";
import { useMediaQuery } from "../design/useMediaQuery";
import { ColorDot } from "../design/primitives";
import { colorKey, kindOf } from "../design/theme";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { sortCardIds } from "./cardSorting";
import { setDeckBuilderPreferences, useDeckBuilderPreferences, type DeckView } from "./deckBuilderPreferences";
import "./deckBuilder.css";

type CountMap = Record<string, number>;

const GRID_CARD_WIDTH = 92;
const LIST_ART_WIDTH = 40;

/** Grid or list, saved as a deck builder preference. */
export function useDeckView() {
  const { deckView: view } = useDeckBuilderPreferences();
  const setView = (deckView: DeckView) => setDeckBuilderPreferences({ deckView });
  return { view, setView };
}

export function DeckViewToggle({ view, onView }: { view: DeckView; onView: (view: DeckView) => void }) {
  const { t } = useTranslation();
  return (
    <div className="deck-segmented" role="group" aria-label={t("deck.viewLabel")}>
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={t("deck.viewGrid")}
        title={t("deck.viewGrid")}
        onClick={() => onView("grid")}
      >
        <Icons.LayoutGrid size={14} />
      </button>
      <button
        type="button"
        aria-pressed={view === "list"}
        aria-label={t("deck.viewList")}
        title={t("deck.viewList")}
        onClick={() => onView("list")}
      >
        <Icons.List size={14} />
      </button>
    </div>
  );
}

interface DeckPreviewSectionsProps {
  view: DeckView;
  format?: DeckFormat;
  arts?: Record<string, string[]>;
  main: CountMap;
  egg: CountMap;
  coverCardId?: string;
  pairConflictCardIds?: ReadonlySet<string>;
  onOpen: (cardId: string) => void;
  onAdd: (cardId: string) => void;
  onRemove: (cardId: string) => void;
}

interface DeckSection {
  id: string;
  label: string;
  cards: CountMap;
  cardIds: string[];
}

function countCards(cards: CountMap): number {
  return Object.values(cards).reduce((sum, count) => sum + count, 0);
}

/** Current-deck preview, arranged around how a player builds an evolution line. */
export function DeckPreviewSections({
  view,
  format = "standard",
  main,
  egg,
  arts,
  coverCardId,
  pairConflictCardIds = new Set<string>(),
  onOpen,
  onAdd,
  onRemove,
}: DeckPreviewSectionsProps) {
  const { t } = useTranslation();
  const phone = useMediaQuery("(width < 600px)");
  const smallPhone = useMediaQuery("(width < 360px)");
  const cardWidth = phone ? (smallPhone ? 112 : 132) : GRID_CARD_WIDTH;
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

  const sections: DeckSection[] = [
    {
      id: "eggs",
      label: t("deck.eggSection", { count: countCards(egg) }),
      cards: egg,
      cardIds: sortCardIds(Object.keys(egg)),
    },
    ...[...byLevel.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, cardIds]) => ({
        id: `level-${level}`,
        label: t("deck.levelSection", { level, count: countCardsFromIds(main, cardIds) }),
        cards: main,
        cardIds: sortCardIds(cardIds),
      })),
    {
      id: "tamers",
      label: t("deck.tamerSection", { count: countCardsFromIds(main, tamers) }),
      cards: main,
      cardIds: sortCardIds(tamers),
    },
    {
      id: "options",
      label: t("deck.optionSection", { count: countCardsFromIds(main, options) }),
      cards: main,
      cardIds: sortCardIds(options),
    },
    {
      id: "other",
      label: t("deck.otherSection", { count: countCardsFromIds(main, other) }),
      cards: main,
      cardIds: sortCardIds(other),
    },
  ].filter((section) => section.cardIds.length > 0);

  if (sections.length === 0) {
    return <div className="deck-preview__empty">{t("deck.addFromPool")}</div>;
  }

  const Entry = view === "grid" ? DeckGridCard : DeckListRow;
  return (
    <div className="deck-preview" data-view={view}>
      {sections.map((section) => (
        <section key={section.id} className="deck-preview__section">
          <div className="deck-preview__label">{section.label}</div>
          <div className="deck-preview__cards">
            {section.cardIds.map((cardId) => (
              <Entry
                key={cardId}
                cardId={cardId}
                cardWidth={cardWidth}
                format={format}
                artId={arts?.[cardId]?.[0]}
                count={section.cards[cardId]!}
                isCover={coverCardId === cardId}
                pairConflict={pairConflictCardIds.has(cardId)}
                onOpen={() => onOpen(cardId)}
                onAdd={() => onAdd(cardId)}
                onRemove={() => onRemove(cardId)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function countCardsFromIds(cards: CountMap, cardIds: readonly string[]): number {
  return cardIds.reduce((sum, cardId) => sum + (cards[cardId] ?? 0), 0);
}

interface DeckEntryProps {
  cardWidth?: number;
  cardId: string;
  format?: DeckFormat;
  artId?: string;
  count: number;
  isCover: boolean;
  pairConflict: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
}

function entryLimits(cardId: string, count: number, pairConflict: boolean, pairLabel: string, format: DeckFormat) {
  const definition = getCardDefinition(cardId)!;
  const cap = Math.min(definition.maxCountInDeck, formatCopyLimit(cardId, format));
  const banned = cap === 0 || !!formatCardViolation(cardId, format) || pairConflict;
  return {
    definition,
    banLabel: pairConflict ? pairLabel : formatRestrictionLabel(cardId, format),
    banned,
    addDisabled: banned || count >= cap,
  };
}

export function DeckStepper({
  name,
  count,
  addDisabled,
  onAdd,
  onRemove,
}: {
  name: string;
  count: number;
  addDisabled: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="deck-stepper">
      <button type="button" onClick={onRemove} aria-label={`${t("common.remove")} ${name}`}>
        –
      </button>
      <span aria-label={t("deck.copiesInDeck", { count })}>{count}</span>
      <button type="button" onClick={onAdd} disabled={addDisabled} aria-label={`${t("common.add")} ${name}`}>
        +
      </button>
    </div>
  );
}

function DeckGridCard({
  cardId,
  cardWidth = GRID_CARD_WIDTH,
  format = "standard",
  artId,
  count,
  isCover,
  pairConflict,
  onOpen,
  onAdd,
  onRemove,
}: DeckEntryProps) {
  const { t } = useTranslation();
  if (!getCardDefinition(cardId)) return null;
  const { definition, banLabel, banned, addDisabled } = entryLimits(
    cardId,
    count,
    pairConflict,
    t("deck.pairBadge"),
    format,
  );
  return (
    <div className="deck-grid-card" data-copies={Math.min(count, 3)}>
      <button
        type="button"
        className="deck-grid-card__open"
        aria-label={t("deck.openCard", { name: definition.nameEn, count })}
        onClick={onOpen}
      >
        <CardFull cardId={cardId} artId={artId} width={cardWidth} count={count} />
        {banLabel ? (
          <span className="deck-grid-card__restriction" data-tone={banned ? "danger" : "warning"}>
            {banLabel}
          </span>
        ) : null}
        {isCover ? (
          <span className="deck-grid-card__cover" title={t("deck.coverCard")}>
            <Icons.Star size={11} />
          </span>
        ) : null}
      </button>
      <DeckStepper name={definition.nameEn} count={count} addDisabled={addDisabled} onAdd={onAdd} onRemove={onRemove} />
    </div>
  );
}

function DeckListRow({
  cardId,
  format = "standard",
  artId,
  count,
  isCover,
  pairConflict,
  onOpen,
  onAdd,
  onRemove,
}: DeckEntryProps) {
  const { t } = useTranslation();
  if (!getCardDefinition(cardId)) return null;
  const { definition, banLabel, banned, addDisabled } = entryLimits(
    cardId,
    count,
    pairConflict,
    t("deck.pairBadge"),
    format,
  );
  const kind = kindOf(definition);
  const typeLabel = kind === "Digimon" && definition.level != null ? `Lv.${definition.level}` : kind;
  return (
    <div className="deck-list-row">
      <button
        type="button"
        className="deck-list-row__open"
        aria-label={t("deck.openCard", { name: definition.nameEn, count })}
        onClick={onOpen}
      >
        <span className="deck-list-row__art" aria-hidden="true">
          <CardFull cardId={cardId} artId={artId} width={LIST_ART_WIDTH} />
        </span>
        <ColorDot color={colorKey(definition.colors[0])} size={8} />
        <span className="deck-list-row__type">{typeLabel}</span>
        <span className="deck-list-row__name">
          {definition.nameEn}
          {isCover ? <Icons.Star size={11} /> : null}
        </span>
        {banLabel ? (
          <span className="deck-tag" data-tone={banned ? "danger" : "warning"}>
            {banLabel}
          </span>
        ) : null}
        <span className="deck-list-row__id">{cardId}</span>
      </button>
      <DeckStepper name={definition.nameEn} count={count} addDisabled={addDisabled} onAdd={onAdd} onRemove={onRemove} />
    </div>
  );
}

/** Main-deck card counts by kind: Digimon, Tamer, Option. */
export function DeckKindCounts({ main }: { main: CountMap }) {
  const { t } = useTranslation();
  const counts = { Digimon: 0, Tamer: 0, Option: 0 };
  for (const [cardId, count] of Object.entries(main)) {
    const definition = getCardDefinition(cardId);
    const kind = definition ? kindOf(definition) : null;
    if (kind === "Digimon" || kind === "Tamer" || kind === "Option") counts[kind] += count;
  }
  return (
    <div className="deck-kind-counts">
      <span>
        {t("deck.kindDigimon")} <strong>{counts.Digimon}</strong>
      </span>
      <span>
        {t("deck.kindTamer")} <strong>{counts.Tamer}</strong>
      </span>
      <span>
        {t("deck.kindOption")} <strong>{counts.Option}</strong>
      </span>
    </div>
  );
}

/** Evolution curve: only Digimon are represented, never play cost. */
export function DeckLevelCurve({ main, compact = false }: { main: CountMap; compact?: boolean }) {
  const { t } = useTranslation();
  const counts = new Map<number, number>();
  for (const [cardId, count] of Object.entries(main)) {
    const definition = getCardDefinition(cardId);
    if (!definition || kindOf(definition) !== "Digimon" || definition.level == null) continue;
    counts.set(definition.level, (counts.get(definition.level) ?? 0) + count);
  }
  const levels = [...new Set([2, 3, 4, 5, 6, 7, ...counts.keys()])].sort((a, b) => a - b);
  const peak = Math.max(1, ...counts.values());
  const tallestBar = compact ? 14 : 52;

  return (
    <div className="deck-level-curve-stat" data-compact={compact}>
      <div className={compact ? "aegis-sr-only" : "deck-stat-label"}>{t("deck.levelCurve")}</div>
      <div className="deck-level-curve" title={compact ? t("deck.levelCurve") : undefined}>
        {levels.map((level) => {
          const count = counts.get(level) ?? 0;
          return (
            <div key={level} className="deck-level-curve__column">
              <span>{count || ""}</span>
              <div
                className="deck-level-curve__bar"
                data-empty={count === 0}
                style={{ height: `${(count / peak) * tallestBar}px` }}
              />
              <span>Lv.{level}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
