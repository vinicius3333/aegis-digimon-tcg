import { useId, useState } from "react";
import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import type { DeckListing } from "@/game/decks";
import { useTranslation } from "@/i18n/useTranslation";

type TournamentDeckPickerParams = {
  decks: readonly DeckListing[];
  value: string;
  onChange: (deckId: string) => void;
  onDecks: () => void;
};

const FILTER_THRESHOLD = 5;

export function TournamentDeckPicker({ decks, value, onChange, onDecks }: TournamentDeckPickerParams) {
  const { t } = useTranslation();
  const id = useId();
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const visible = decks.filter((deck) => deck.name.toLocaleLowerCase().includes(search));

  if (decks.length === 0) {
    return (
      <div className="tournaments-deck-empty">
        <Icons.Cards size={20} aria-hidden="true" />
        <p>{t("tournaments.detail.needDeck")}</p>
        <Button size="sm" variant="secondary" onClick={onDecks}>
          {t("tournaments.deck.editLibrary")}
        </Button>
      </div>
    );
  }

  return (
    <fieldset className="tournaments-deck-picker">
      <legend>{t("tournaments.detail.deck")}</legend>
      {decks.length > FILTER_THRESHOLD ? (
        <label className="tournaments-deck-picker__filter" htmlFor={`${id}-filter`}>
          <Icons.Search size={14} aria-hidden="true" />
          <span className="aegis-sr-only">{t("tournaments.detail.deckFilter")}</span>
          <input
            id={`${id}-filter`}
            type="search"
            autoComplete="off"
            value={query}
            placeholder={t("tournaments.detail.deckFilter")}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      ) : null}
      <div className="tournaments-deck-picker__list">
        {visible.map((deck) => (
          <label key={deck.id} className="tournaments-deck-option" data-selected={deck.id === value || undefined}>
            <input
              type="radio"
              name={`${id}-deck`}
              value={deck.id}
              checked={deck.id === value}
              onChange={() => onChange(deck.id)}
            />
            <span className="tournaments-deck-option__copy">
              <b>{deck.name}</b>
              <small>{t("lobby.famousDeckCards", { main: deck.mainDeck.length, egg: deck.eggDeck.length })}</small>
            </span>
          </label>
        ))}
        {visible.length === 0 ? <p className="tournaments-note">{t("tournaments.detail.deckFilterEmpty")}</p> : null}
      </div>
    </fieldset>
  );
}
