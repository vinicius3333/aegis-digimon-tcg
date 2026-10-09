import { deckFormatLabel } from "./DeckFormatSelector";
/* The deck picker: a hero with the create and import actions, then every saved deck
   as a table row (a card on narrow screens) with its edit, export, activate and
   delete actions. */

import { useState } from "react";
import {
  deckLegality,
  getCardDefinition,
  formatRestrictionLabel,
  deckFormat,
  type CommunityPublication,
} from "@aegis/shared";
import { useCommunityPublications } from "../community/useCommunityPublications";
import { Badge, Button, ColorDot, Eyebrow, Field } from "../design/primitives";
import { Panel, SectionHeading, StatStrip } from "../design/surfaces";
import { CoverThumb } from "../design/cards";
import { Icons } from "../design/icons";
import {
  createBlankDeck,
  deckBlurbLabel,
  displayCoverArt,
  displayCoverCard,
  parseDeckList,
  type DeckListing,
} from "../game/decks";
import { useTranslation, type TranslationKey } from "../i18n";
import { DeckDeleteModal, DeckImportModal } from "./DeckTextModals";
import { DeckImageButton } from "./DeckImageButton";
import { DeckPublishModal, type PublishMode } from "./DeckPublishModal";
import { EGG_TARGET, MAIN_TARGET } from "./deckCounts";
import {
  DECK_LIST_SORTS,
  deckColors,
  isDeckListSort,
  orderDecks,
  setDeckListSort,
  useDeckListSort,
  type DeckListSort,
} from "./deckListOrder";
import "./deckList.css";

const SORT_LABELS: Record<DeckListSort, TranslationKey> = {
  recent: "redesign.decks.list.sortRecent",
  name: "redesign.decks.list.sortName",
  color: "redesign.decks.list.sortColor",
};

/* ---------------- deck list ---------------- */
export function DeckList({
  decks,
  activeDeckId,
  onEdit,
  onNew,
  onSelectDeck,
  onDelete,
  onPlay,
  signedIn = false,
}: {
  decks: DeckListing[];
  activeDeckId: string;
  onEdit: (deck: DeckListing) => void;
  onNew: () => void;
  onSelectDeck: (id: string) => void;
  onDelete: (id: string) => void;
  onPlay: () => void;
  signedIn?: boolean;
}) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<DeckListing | null>(null);
  const [query, setQuery] = useState("");
  const sort = useDeckListSort();
  const shownDecks = orderDecks(decks, sort, query);
  const [publishing, setPublishing] = useState<{ deck: DeckListing; mode: PublishMode } | null>(null);
  const { publications, publish, unpublish } = useCommunityPublications(signedIn);

  const handleImport = (text: string) => {
    const result = parseDeckList(text);
    const base = createBlankDeck(decks, undefined, t("deck.newDeckName"));
    onEdit({
      ...base,
      mainDeck: result.mainDeck,
      eggDeck: result.eggDeck,
      mainDeckArts: result.mainDeckArts,
      eggDeckArts: result.eggDeckArts,
    });
    setImporting(false);
  };

  const activeDeck = decks.find((deck) => deck.id === activeDeckId);
  const readyCount = decks.filter((deck) => deckLegality(deck, { format: deck.format }).legal).length;

  return (
    <div className="deck-list-page">
      <div className="deck-list-page__column aegis-page-sheet">
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
        {publishing ? (
          <DeckPublishModal
            deck={publishing.deck}
            mode={publishing.mode}
            onPublish={publish}
            onUnpublish={unpublish}
            onClose={() => setPublishing(null)}
          />
        ) : null}

        <section className="deck-list-section" aria-labelledby="deck-list-saved-title">
          <SectionHeading id="deck-list-saved-title" title={t("redesign.decks.list.saved")} />
          {decks.length > 0 ? (
            <div className="deck-list-toolbar">
              <Field
                className="deck-list-toolbar__search"
                label={t("redesign.decks.list.search")}
                name="deckListSearch"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("redesign.decks.list.searchPlaceholder")}
              />
              <label className="deck-list-toolbar__sort">
                <span className="aegis-sr-only">{t("redesign.decks.list.sort")}</span>
                <select
                  value={sort}
                  onChange={(event) => {
                    if (isDeckListSort(event.target.value)) setDeckListSort(event.target.value);
                  }}
                >
                  {DECK_LIST_SORTS.map((option) => (
                    <option key={option} value={option}>
                      {t(SORT_LABELS[option])}
                    </option>
                  ))}
                </select>
                <Icons.ChevronDown className="deck-list-toolbar__chevron" size={16} />
              </label>
            </div>
          ) : null}
          {decks.length === 0 ? (
            <p className="deck-list-empty" role="status">
              {t("deck.empty")}
            </p>
          ) : shownDecks.length === 0 ? (
            <p className="deck-list-empty" role="status">
              {t("redesign.decks.list.noMatches", { query: query.trim() })}
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
                {shownDecks.map((deck) => (
                  <DeckListRow
                    key={deck.id}
                    deck={deck}
                    active={deck.id === activeDeckId}
                    onEdit={() => onEdit(deck)}
                    onSelect={() => onSelectDeck(deck.id)}
                    onPlay={onPlay}
                    onDelete={() => setDeleting(deck)}
                    signedIn={signedIn}
                    publication={publications.get(deck.id)}
                    onPublishAction={(mode) => setPublishing({ deck, mode })}
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
  signedIn,
  publication,
  onPublishAction,
}: {
  deck: DeckListing;
  active: boolean;
  onEdit: () => void;
  onSelect: () => void;
  onPlay: () => void;
  onDelete: () => void;
  signedIn: boolean;
  publication: CommunityPublication | undefined;
  onPublishAction: (mode: PublishMode) => void;
}) {
  const { t } = useTranslation();
  const { legal, banViolations, pairViolations } = deckLegality(deck, { format: deck.format });
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
            {deck.format && deck.format !== "standard" ? <Badge>{deckFormatLabel(deck.format, t)}</Badge> : null}
            {active ? (
              <Badge tone="primary">
                <Icons.Check size={12} />
                {t("deck.active")}
              </Badge>
            ) : null}
            <Badge tone={legal ? "success" : "neutral"}>
              {legal ? t("redesign.decks.list.legal") : t("redesign.decks.list.draft")}
            </Badge>
            {publication?.status === "hidden" ? (
              <Badge tone="danger" className="deck-list-row__visibility">
                <Icons.Flag size={12} />
                {t("community.moderation.hiddenOwnerBadge")}
              </Badge>
            ) : publication ? (
              <Badge tone="primary" className="deck-list-row__visibility">
                <Icons.Users size={12} />
                {t("community.publish.public")}
                <Icons.Heart size={12} />
                {publication.likeCount}
              </Badge>
            ) : signedIn ? (
              <Badge className="deck-list-row__visibility">{t("community.publish.private")}</Badge>
            ) : null}
          </div>
          {publication?.status === "hidden" ? (
            <p className="deck-list-row__blurb">{t("community.moderation.hiddenOwnerNote")}</p>
          ) : publication?.outdated ? (
            <p className="deck-list-row__blurb">{t("community.publish.outdated")}</p>
          ) : null}
          {blurb ? <p className="deck-list-row__blurb">{blurb}</p> : null}
          {banViolations.length > 0 ? (
            <p className="deck-list-row__violation">
              {banViolations.map(([id]) => (
                <span key={id}>
                  {getCardDefinition(id)?.nameEn ?? id} ({formatRestrictionLabel(id, deckFormat(deck.format))}){" "}
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
        {!signedIn ? null : (
          <div className="deck-list-row__publish">
            {publication?.status === "hidden" ? null : publication ? (
              <>
                {publication.outdated && deckLegality(deck).legal ? (
                  <Button size="sm" variant="secondary" icon={Icons.Users} onClick={() => onPublishAction("update")}>
                    {t("community.publish.update")}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => onPublishAction("unpublish")}>
                  {t("community.publish.unpublish")}
                </Button>
              </>
            ) : deckLegality(deck).legal ? (
              <Button size="sm" variant="ghost" icon={Icons.Users} onClick={() => onPublishAction("publish")}>
                {t("community.publish.action")}
              </Button>
            ) : null}
          </div>
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
