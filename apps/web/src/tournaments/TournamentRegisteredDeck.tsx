import { useId, useState } from "react";
import type { TournamentOwnDeck } from "@aegis/shared/tournaments/TournamentOwnDeck";
import { Alert, Button } from "@/design/primitives";
import { dominantColor, type DeckListing } from "@/game/decks";
import { useTranslation } from "@/i18n/useTranslation";
import { FamousDeckListDialog } from "@/screens/FamousDeckListDialog";
import { tournamentApi } from "@/tournaments/client";

type Props = {
  tournamentId: string;
  deck: TournamentOwnDeck;
  decks: readonly DeckListing[];
  canChange: boolean;
  onChanged: () => void;
  onDecks: () => void;
};

export function TournamentRegisteredDeck({ tournamentId, deck, decks, canChange, onChanged, onDecks }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [selected, setSelected] = useState(
    decks.some((entry) => entry.id === deck.savedDeckId) ? (deck.savedDeckId ?? "") : "",
  );
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const editable = canChange && !deck.locked;

  async function changeDeck() {
    setBusy(true);
    setFailed(false);
    const result = await tournamentApi.changeDeck(tournamentId, selected);
    setBusy(false);
    if (!result.ok) {
      setFailed(true);
      return;
    }
    onChanged();
  }

  return (
    <section className="tournaments-registered-deck" aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`}>{t("tournaments.deck.registered")}</h4>
      <strong>{deck.available === false ? t("tournaments.deck.unavailable") : deck.name}</strong>
      <p className="tournaments-note">{t(editable ? "tournaments.deck.editable" : "tournaments.deck.locked")}</p>
      <div className="tournaments-detail__actions">
        <Button variant="secondary" disabled={deck.available === false} onClick={() => setPreview(true)}>
          {t("tournaments.deck.view")}
        </Button>
        {editable ? (
          <Button variant="secondary" onClick={onDecks}>
            {t("tournaments.deck.editLibrary")}
          </Button>
        ) : null}
      </div>
      {editable ? (
        <div className="aegis-field">
          <label className="aegis-field__label" htmlFor={`${id}-select`}>
            {t("tournaments.deck.replace")}
          </label>
          <select
            id={`${id}-select`}
            className="aegis-field__control"
            value={selected}
            disabled={busy}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="" disabled>
              {t("tournaments.deck.replace")}
            </option>
            {decks.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <Button disabled={busy || !selected || selected === deck.savedDeckId} onClick={() => void changeDeck()}>
            {t("tournaments.deck.save")}
          </Button>
        </div>
      ) : null}
      {failed ? (
        <Alert tone="danger" title={t("tournaments.error.action")}>
          {t("tournaments.deck.failed")}
        </Alert>
      ) : null}
      {preview ? (
        <FamousDeckListDialog
          deck={{
            id: deck.savedDeckId ?? tournamentId,
            name: deck.name,
            mainDeck: deck.mainDeck,
            eggDeck: deck.eggDeck,
            color: dominantColor(deck.mainDeck),
            blurb: "",
          }}
          collection=""
          active={false}
          eyebrow={t("tournaments.deck.registered")}
          onClose={() => setPreview(false)}
        />
      ) : null}
    </section>
  );
}
