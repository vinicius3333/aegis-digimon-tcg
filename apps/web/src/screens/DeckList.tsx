/* The deck picker: a hero with the create and import actions, then every saved deck
   as a table row (a card on narrow screens) with its edit, export, activate and
   delete actions. */

import { useState } from "react";
import { getCardDefinition, restrictionLabel } from "@aegis/shared";
import { Badge, Button, ColorDot, Eyebrow } from "../design/primitives";
import { Panel, SectionHeading, StatStrip } from "../design/surfaces";
import { CoverThumb } from "../design/cards";
import { Icons } from "../design/icons";
import { colorKey } from "../design/theme";
import {
  createBlankDeck,
  deckBlurbLabel,
  displayCoverArt,
  displayCoverCard,
  parseDeckList,
  type DeckListing,
} from "../game/decks";
import { deckLegality } from "./DeckListCard";
import { useTranslation } from "../i18n";
import { DeckDeleteModal, DeckImportModal } from "./DeckTextModals";
import { DeckImageButton } from "./DeckImageButton";
import { EGG_TARGET, MAIN_TARGET } from "./deckCounts";
import "./deckList.css";

const SHOWN_COLORS = 3;

function deckColors(deck: DeckListing): string[] {
  const counts = new Map<string, number>();
  for (const cardId of deck.mainDeck) {
    for (const color of getCardDefinition(cardId)?.colors ?? []) {
      const key = colorKey(color);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color);
  return ranked.length > 0 ? ranked.slice(0, SHOWN_COLORS) : [deck.color];
}

/* ---------------- deck list ---------------- */
export function DeckList({
  decks,
  activeDeckId,
  onEdit,
  onNew,
  onSelectDeck,
  onDelete,
  onPlay,
}: {
  decks: DeckListing[];
  activeDeckId: string;
  onEdit: (deck: DeckListing) => void;
  onNew: () => void;
  onSelectDeck: (id: string) => void;
  onDelete: (id: string) => void;
  onPlay: () => void;
}) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<DeckListing | null>(null);

  const handleImport = (text: string) => {
    const result = parseDeckList(text);
    const base = createBlankDeck(decks, undefined, t("deck.newDeckName"));
    onEdit({ ...base, mainDeck: result.mainDeck, eggDeck: result.eggDeck });
    setImporting(false);
  };

  const activeDeck = decks.find((deck) => deck.id === activeDeckId);
  const readyCount = decks.filter((deck) => deckLegality(deck).legal).length;

  return (
    <div className="deck-list-page">
      <div className="deck-list-page__column">
        <Panel as="div" className="deck-list-hero">
          <div className="deck-list-header">
            <div className="deck-list-hero__copy">
              <Eyebrow>{t("deck.eyebrow")}</Eyebrow>
              <h1 className="aegis-page-title">{t("deck.title")}</h1>
            </div>
            <div className="deck-list-actions">
              <Button variant="secondary" icon={Icons.Upload} onClick={() => setImporting(true)}>
                {t("common.import")}
              </Button>
              <Button icon={Icons.Plus} onClick={onNew}>
                {t("deck.new")}
              </Button>
            </div>
          </div>
          {decks.length > 0 ? (
            <StatStrip
              className="deck-list-hero__stats"
              stats={[
                { label: t("redesign.decks.list.statDecks"), value: decks.length },
                { label: t("redesign.decks.list.statReady"), value: readyCount },
                {
                  label: t("redesign.decks.list.statActive"),
                  value: <span className="deck-list-hero__active">{activeDeck?.name ?? t("common.none")}</span>,
                },
              ]}
            />
          ) : null}
        </Panel>

        {importing ? <DeckImportModal onImport={handleImport} onClose={() => setImporting(false)} /> : null}
        {deleting ? (
          <DeckDeleteModal
            deck={deleting}
            onConfirm={() => {
              onDelete(deleting.id);
              setDeleting(null);
            }}
            onClose={() => setDeleting(null)}
          />
        ) : null}

        <section className="deck-list-section" aria-labelledby="deck-list-saved-title">
          <SectionHeading id="deck-list-saved-title" title={t("redesign.decks.list.saved")} />
          {decks.length === 0 ? (
            <p className="deck-list-empty" role="status">
              {t("deck.empty")}
            </p>
          ) : (
            <div className="deck-list-table" role="table" aria-labelledby="deck-list-saved-title">
              <div className="deck-list-table__head" role="rowgroup">
                <div className="deck-list-table__row" role="row">
                  <span role="columnheader">{t("redesign.decks.list.columnDeck")}</span>
                  <span role="columnheader">{t("redesign.decks.list.columnColors")}</span>
                  <span role="columnheader">{t("deck.main")}</span>
                  <span role="columnheader">{t("deck.egg")}</span>
                  <span role="columnheader">
                    <span className="aegis-sr-only">{t("redesign.decks.list.columnActions")}</span>
                  </span>
                </div>
              </div>
              <div className="deck-list-grid" role="rowgroup">
                {decks.map((deck) => (
                  <DeckListRow
                    key={deck.id}
                    deck={deck}
                    active={deck.id === activeDeckId}
                    onEdit={() => onEdit(deck)}
                    onSelect={() => onSelectDeck(deck.id)}
                    onPlay={onPlay}
                    onDelete={() => setDeleting(deck)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DeckListRow({
  deck,
  active,
  onEdit,
  onSelect,
  onPlay,
  onDelete,
}: {
  deck: DeckListing;
  active: boolean;
  onEdit: () => void;
  onSelect: () => void;
  onPlay: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { legal, banViolations, pairViolations } = deckLegality(deck);
  const colors = deckColors(deck);
  const blurb = deckBlurbLabel(t, deck.blurb);

  return (
    <div className={`deck-list-table__row deck-list-row${active ? " is-active" : ""}`} role="row">
      <div className="deck-list-row__deck" role="cell">
        <span className="deck-list-row__cover">
          <CoverThumb
            key={displayCoverCard(deck)}
            coverCardId={displayCoverCard(deck)}
            artId={displayCoverArt(deck)}
            sigilColor={deck.color}
            sigilSize={28}
          />
        </span>
        <div className="deck-list-row__identity">
          <div className="deck-list-row__name">
            <h3>{deck.name}</h3>
            {active ? (
              <Badge tone="primary">
                <Icons.Check size={12} />
                {t("deck.active")}
              </Badge>
            ) : null}
            <Badge tone={legal ? "success" : "neutral"}>
              {legal ? t("redesign.decks.list.legal") : t("redesign.decks.list.draft")}
            </Badge>
          </div>
          {blurb ? <p className="deck-list-row__blurb">{blurb}</p> : null}
          {banViolations.length > 0 ? (
            <p className="deck-list-row__violation">
              {banViolations.map(([id]) => (
                <span key={id}>
                  {getCardDefinition(id)?.nameEn ?? id} ({restrictionLabel(id)}){" "}
                </span>
              ))}
            </p>
          ) : null}
          {pairViolations.length > 0 ? (
            <div className="deck-list-row__violation deck-list-row__violation--pair">
              <strong>{t("deck.pairTitle")}</strong>
              {pairViolations.map(([a, b]) => (
                <div key={`${a}-${b}`}>
                  {t("deck.pairRow", {
                    a: getCardDefinition(a)?.nameEn ?? a,
                    b: getCardDefinition(b)?.nameEn ?? b,
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="deck-list-row__colors" role="cell">
        <span role="img" aria-label={t("redesign.decks.list.colors", { colors: colors.join(", ") })}>
          {colors.map((color) => (
            <ColorDot key={color} color={color} size={10} />
          ))}
        </span>
      </div>
      <div className="deck-list-row__count" role="cell" data-complete={deck.mainDeck.length === MAIN_TARGET}>
        <span className="deck-list-row__count-label" aria-hidden="true">
          {t("deck.main")}
        </span>
        {deck.mainDeck.length}/{MAIN_TARGET}
      </div>
      <div className="deck-list-row__count" role="cell" data-complete={deck.eggDeck.length === EGG_TARGET}>
        <span className="deck-list-row__count-label" aria-hidden="true">
          {t("deck.egg")}
        </span>
        {deck.eggDeck.length}/{EGG_TARGET}
      </div>
      <div className="deck-list-row__actions" role="cell">
        <Button size="sm" variant="secondary" icon={Icons.FileText} onClick={onEdit}>
          {t("common.edit")}
        </Button>
        <DeckImageButton deck={deck} size="sm" variant="secondary" label={t("common.export")} />
        {active && legal ? (
          <Button size="sm" icon={Icons.Swords} onClick={onPlay}>
            {t("common.play")}
          </Button>
        ) : legal ? (
          <Button size="sm" variant="ghost" onClick={onSelect}>
            {t("deck.setActive")}
          </Button>
        ) : (
          <span className="deck-list-row__hint">{t("deck.finishToUse")}</span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="deck-list-row__delete"
          icon={Icons.Trash}
          aria-label={t("deck.delete")}
          title={t("deck.delete")}
          onClick={onDelete}
        />
      </div>
    </div>
  );
}
