/* Unified battle-deck picker for the lobby. One search box and one segmented
   filter cover both the player's own decks and the famous presets, so a query
   like "Jupitermon" finds a preset even when its collection group is collapsed. */

import { memo, useMemo, useState } from "react";
import { Button, Eyebrow, Field, IconButton } from "../design/primitives";
import { Icons } from "../design/icons";
import {
  FAMOUS_DECK_GROUPS,
  type DeckListing,
  type FamousDeckListingGroup,
} from "../game/decks";
import { useTranslation } from "../i18n";
import { DeckListCard } from "./DeckListCard";
import "./deckPicker.css";

export type DeckFilter = "all" | "mine" | "famous";

export interface OwnDeckEntry {
  deck: DeckListing;
  legal: boolean;
}

function matchesQuery(
  deck: DeckListing,
  query: string,
  collection?: string,
): boolean {
  if (query === "") return true;
  const haystack = [deck.name, deck.color, deck.blurb, collection ?? ""]
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(query);
}

function SetCover({ collection }: { collection: string }) {
  const [missing, setMissing] = useState(false);
  if (missing)
    return (
      <span className="deck-picker__set-fallback">
        {collection.slice(0, 2)}
      </span>
    );
  return (
    <img
      className="deck-picker__set"
      src={`/sets/${collection}.jpg`}
      alt=""
      aria-hidden="true"
      onError={() => setMissing(true)}
    />
  );
}

function DeckPickerView({
  ownDecks,
  activeDeckId,
  randomSelected,
  randomPoolSize,
  onSelectRandom,
  onSelectDeck,
  onCopyDeck,
  onViewDeck,
  onEditDeck,
  onBuildDeck,
}: {
  ownDecks: OwnDeckEntry[];
  activeDeckId: string;
  randomSelected: boolean;
  randomPoolSize: number;
  onSelectRandom: () => void;
  onSelectDeck: (id: string) => void;
  onCopyDeck: (deck: DeckListing) => void;
  onViewDeck: (deck: DeckListing) => void;
  onEditDeck: (deck: DeckListing) => void;
  onBuildDeck: () => void;
}) {
  const { t } = useTranslation();
  const deckCount = (count: number) =>
    t(count === 1 ? "lobby.deckCountOne" : "lobby.deckCount", { count });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DeckFilter>("all");
  const [ownDecksOpen, setOwnDecksOpen] = useState(true);
  const [openCollections, setOpenCollections] = useState<ReadonlySet<string>>(
    () =>
      new Set(FAMOUS_DECK_GROUPS.slice(0, 1).map((group) => group.collection)),
  );
  const query = search.trim().toLocaleLowerCase();
  const searching = query !== "";

  const visibleOwnDecks = useMemo(
    () => ownDecks.filter(({ deck }) => matchesQuery(deck, query)),
    [ownDecks, query],
  );
  const visibleGroups = useMemo<FamousDeckListingGroup[]>(
    () =>
      FAMOUS_DECK_GROUPS.map((group) => ({
        collection: group.collection,
        decks: group.decks.filter((deck) =>
          matchesQuery(deck, query, group.collection),
        ),
      })).filter((group) => group.decks.length > 0),
    [query],
  );
  const famousTotal = FAMOUS_DECK_GROUPS.reduce(
    (sum, group) => sum + group.decks.length,
    0,
  );
  const visibleFamousCount = visibleGroups.reduce(
    (sum, group) => sum + group.decks.length,
    0,
  );
  const showOwn = filter !== "famous";
  const showFamous = filter !== "mine";
  const visibleCount =
    (showOwn ? visibleOwnDecks.length : 0) +
    (showFamous ? visibleFamousCount : 0);

  const filters: { key: DeckFilter; label: string; count: number }[] = [
    {
      key: "all",
      label: t("lobby.filterAll"),
      count: ownDecks.length + famousTotal,
    },
    { key: "mine", label: t("lobby.filterMine"), count: ownDecks.length },
    { key: "famous", label: t("lobby.filterFamous"), count: famousTotal },
  ];

  return (
    <section className="deck-picker" aria-labelledby="deck-picker-title">
      <header className="deck-picker__header">
        <div>
          <Eyebrow color="var(--ds-fg-muted)">{t("lobby.battleDeck")}</Eyebrow>
          <h2 id="deck-picker-title">{t("lobby.pickDeck")}</h2>
          <p>{t("lobby.pickDeckHint")}</p>
        </div>
        <Button
          className="deck-picker__random-action"
          variant={randomSelected ? "primary" : "secondary"}
          icon={randomSelected ? Icons.Check : Icons.Dices}
          disabled={randomPoolSize === 0}
          aria-pressed={randomSelected}
          onClick={onSelectRandom}
        >
          {t(randomSelected ? "lobby.randomSelected" : "lobby.randomAction")}
        </Button>
      </header>

      <div className="deck-picker__toolbar">
        <Field
          className="deck-picker__search"
          label={t("lobby.searchDecks")}
          name="deckSearch"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("lobby.searchDecksPlaceholder")}
        />
        <div
          className="deck-picker__filters"
          role="group"
          aria-label={t("lobby.filterLabel")}
        >
          {filters.map((option) => (
            <button
              type="button"
              key={option.key}
              className={filter === option.key ? "is-selected" : undefined}
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
              <span className="deck-picker__filter-count">{option.count}</span>
            </button>
          ))}
        </div>
        <span className="deck-picker__result-count" role="status">
          {deckCount(visibleCount)}
        </span>
      </div>

      {showOwn ? (
        <section
          className="deck-picker__group deck-picker__own"
          aria-label={t("lobby.yourDecks")}
        >
          <details open={searching || ownDecksOpen}>
            <summary
              className="deck-picker__group-summary"
              onClick={(event) => {
                event.preventDefault();
                setOwnDecksOpen((current) => !current);
              }}
            >
              <h3 className="deck-picker__group-title">
                {t("lobby.yourDecks")}
              </h3>
              <span className="deck-picker__collection-count">
                {deckCount(ownDecks.length)}
              </span>
              <Icons.ChevronDown className="deck-picker__chevron" size={16} />
            </summary>
            {ownDecks.length === 0 ? (
              <p className="deck-picker__empty">
                {t("lobby.noDecks")} {" "}
                <button type="button" className="aegis-text-action" onClick={onBuildDeck}>
                  {t("lobby.noDecksLink")}
                </button>
                .
              </p>
            ) : visibleOwnDecks.length === 0 ? (
              <p className="deck-picker__empty">{t("lobby.noSearchResults")}</p>
            ) : (
              <div className="lobby-decks">
                {visibleOwnDecks.map(({ deck, legal }) => (
                  <DeckListCard
                    key={deck.id}
                    deck={deck}
                    active={!randomSelected && deck.id === activeDeckId}
                    compact
                    disabled={!legal}
                    onSelect={() => onSelectDeck(deck.id)}
                    actions={
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Icons.FileText}
                        onClick={() => onEditDeck(deck)}
                      >
                        {t("common.edit")}
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </details>
        </section>
      ) : null}

      {showFamous ? (
        <section
          className="deck-picker__group"
          aria-labelledby="deck-picker-famous-title"
        >
          <div className="deck-picker__group-heading">
            <h3
              className="deck-picker__group-title"
              id="deck-picker-famous-title"
            >
              {t("lobby.famousDecks")}
            </h3>
            <p>{t("lobby.famousDecksDesc")}</p>
          </div>
          {visibleGroups.length === 0 ? (
            <p className="deck-picker__empty">{t("lobby.noSearchResults")}</p>
          ) : null}
          {visibleGroups.map((group) => {
            const headingId = `famous-${group.collection.toLowerCase()}`;
            const open = searching || openCollections.has(group.collection);
            return (
              <section
                className="deck-picker__collection"
                aria-labelledby={headingId}
                key={group.collection}
              >
                <details open={open}>
                  <summary
                    className="deck-picker__summary"
                    onClick={(event) => {
                      event.preventDefault();
                      setOpenCollections((current) => {
                        const next = new Set(current);
                        if (next.has(group.collection))
                          next.delete(group.collection);
                        else next.add(group.collection);
                        return next;
                      });
                    }}
                  >
                    <SetCover collection={group.collection} />
                    <h4 id={headingId}>{group.collection}</h4>
                    <span className="deck-picker__collection-count">
                      {deckCount(group.decks.length)}
                    </span>
                    <Icons.ChevronDown
                      className="deck-picker__chevron"
                      size={16}
                    />
                  </summary>
                  {/* Closed groups skip their cards: the picker holds every preset. */}
                  {open ? (
                    <div className="lobby-decks">
                      {group.decks.map((deck) => {
                        const active = !randomSelected && deck.id === activeDeckId;
                        return (
                          <DeckListCard
                            key={deck.id}
                            deck={deck}
                            active={active}
                            compact
                            onSelect={() => onSelectDeck(deck.id)}
                            actions={
                              <>
                                {active ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={Icons.FileText}
                                    onClick={() => onCopyDeck(deck)}
                                  >
                                    {t("lobby.copyPreset")}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={Icons.Swords}
                                    onClick={() => onSelectDeck(deck.id)}
                                  >
                                    {t("lobby.useDeck")}
                                  </Button>
                                )}
                                <IconButton
                                  size="sm"
                                  variant="secondary"
                                  label={t("lobby.viewList")}
                                  title={t("lobby.viewList")}
                                  onClick={() => onViewDeck(deck)}
                                >
                                  <Icons.Eye size={16} />
                                </IconButton>
                              </>
                            }
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </details>
              </section>
            );
          })}
        </section>
      ) : null}
    </section>
  );
}

/* Memoized: the lobby re-renders on every mode or dialog change, and this list
   holds every famous preset. */
export const DeckPicker = memo(DeckPickerView);
