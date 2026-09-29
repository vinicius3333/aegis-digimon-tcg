/* The builder itself: a filterable pool on the left, the 50-main + 5-egg list on the
   right, and the legality counters that gate a save. */

import { useMemo, useState, useEffect, useRef } from "react";
import {
  bannedPairViolations,
  getCardDefinition,
  resolveCardArt,
  type CardDefinition,
  isBanned,
  effectiveCopyLimit as banlistLimit,
  sharedCardNumberCount,
  sharedCardNumberGroups,
} from "@aegis/shared";
import { Button, type Screen } from "../design/primitives";
import { CoverThumb } from "../design/cards";
import { Icons } from "../design/icons";
import { Panel, SectionHeading } from "../design/surfaces";
import { CardDetailDrawer } from "./CardDetailDrawer";
import { FilterRail } from "./FilterRail";
import { useCardFilter } from "./cardFilters";
import { sortCards } from "./cardSorting";
import {
  activeCollectionCards,
  displayCoverCard,
  dominantColor,
  parseDeckList,
  randomCoverCard,
  serializeDeckList,
  type DeckListing,
} from "../game/decks";
import { DeckLevelCurve, DeckPreviewSections } from "./deckPreview";
import { DeckArtworkPicker } from "./DeckArtworkPicker";
import { useTranslation } from "../i18n";
import { ColorBalance } from "./ColorBalance";
import { CountChip } from "./CountChip";
import { DeckExportModal, DeckImportModal } from "./DeckTextModals";
import { PoolCard } from "./PoolCard";
import { CountMap, EGG_TARGET, MAIN_TARGET, expand, isEggCard, toCountMap, total } from "./deckCounts";
import "./deckBuilder.css";

const PAGE_SIZE = 60;

/* ---------------- editor ---------------- */
export function DeckEditor({
  deck,
  onSave,
  onClose,
  onNav,
}: {
  deck: DeckListing;
  onSave: (deck: DeckListing, setActive: boolean) => void;
  onClose: () => void;
  onNav: (s: Screen) => void;
}) {
  const { t } = useTranslation();
  const pool = useMemo<CardDefinition[]>(() => activeCollectionCards(), []);
  const filter = useCardFilter(pool, { colorFilterMode: "all" });
  const [main, setMain] = useState<CountMap>(() => toCountMap(deck.mainDeck));
  const [egg, setEgg] = useState<CountMap>(() => toCountMap(deck.eggDeck));
  const [arts, setArts] = useState<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    for (const [ids, choices] of [
      [deck.mainDeck, deck.mainDeckArts],
      [deck.eggDeck, deck.eggDeckArts],
    ] as const) {
      ids.forEach((id, index) => (result[id] ??= []).push(resolveCardArt(id, choices?.[index]).artId));
    }
    return result;
  });
  const [chosenArt, setChosenArt] = useState<Record<string, string>>({});
  const [artPickerCard, setArtPickerCard] = useState<string | null>(null);
  const [name, setName] = useState(deck.name);
  const [coverCardId, setCoverCardId] = useState<string | undefined>(() => displayCoverCard(deck));
  const [sel, setSel] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deckInfoOpen, setDeckInfoOpen] = useState(false);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const mainCount = total(main);
  const eggCount = total(egg);
  const validMain = mainCount === MAIN_TARGET;

  const deckCardIds = useMemo(
    () => [...Object.entries(main), ...Object.entries(egg)].flatMap(([cardId, count]) => Array(count).fill(cardId)),
    [main, egg],
  );

  const add = (cardId: string) => {
    const def = getCardDefinition(cardId);
    if (!def) return;
    if (isBanned(cardId)) return;
    const eggCard = isEggCard(def);
    const map = eggCard ? egg : main;
    const cur = map[cardId] ?? 0;
    const cap = Math.min(def.maxCountInDeck, banlistLimit(cardId));
    if (sharedCardNumberCount(deckCardIds, cardId) >= cap) return;
    if (eggCard && eggCount >= EGG_TARGET) return;
    if (!eggCard && mainCount >= MAIN_TARGET) return;
    setArts((previous) => ({
      ...previous,
      [cardId]: [...(previous[cardId] ?? []), resolveCardArt(cardId, chosenArt[cardId]).artId],
    }));
    (eggCard ? setEgg : setMain)({ ...map, [cardId]: cur + 1 });
  };
  const remove = (cardId: string) => {
    const def = getCardDefinition(cardId);
    if (!def) return;
    const eggCard = isEggCard(def);
    const map = eggCard ? egg : main;
    const cur = map[cardId] ?? 0;
    if (!cur) return;
    const next = { ...map };
    if (cur === 1) delete next[cardId];
    else next[cardId] = cur - 1;
    setArts((previous) => ({ ...previous, [cardId]: (previous[cardId] ?? []).slice(0, cur - 1) }));
    (eggCard ? setEgg : setMain)(next);
  };

  const banlistViolations = useMemo(() => {
    const violations: { cardId: string; count: number; cap: number }[] = [];
    for (const [cardId, count] of Object.entries(main)) {
      const cap = banlistLimit(cardId);
      if (count > cap) violations.push({ cardId, count, cap });
    }
    for (const [cardId, count] of Object.entries(egg)) {
      const cap = banlistLimit(cardId);
      if (count > cap) violations.push({ cardId, count, cap });
    }
    for (const [, members] of sharedCardNumberGroups(deckCardIds)) {
      if (members.length < 2) continue;
      const count = sharedCardNumberCount(deckCardIds, members[0]!);
      const cap = Math.min(...members.map(banlistLimit));
      if (count > cap) violations.push({ cardId: members.join(" + "), count, cap });
    }
    return violations;
  }, [main, egg, deckCardIds]);

  const pairViolations = useMemo(() => bannedPairViolations([...Object.keys(main), ...Object.keys(egg)]), [main, egg]);
  const pairedCardIds = useMemo(() => new Set(pairViolations.flat()), [pairViolations]);

  const persist = (setActive: boolean) => {
    const mainDeck = expand(main);
    const eggDeck = expand(egg);
    onSaveRef.current(
      {
        ...deck,
        name: name.trim() || t("deck.untitled"),
        color: dominantColor(mainDeck, deck.color),
        mainDeck,
        eggDeck,
        coverCardId,
        mainDeckArts: Object.entries(main).flatMap(([id, count]) =>
          Array.from({ length: count }, (_, i) => resolveCardArt(id, arts[id]?.[i]).artId),
        ),
        eggDeckArts: Object.entries(egg).flatMap(([id, count]) =>
          Array.from({ length: count }, (_, i) => resolveCardArt(id, arts[id]?.[i]).artId),
        ),
      },
      setActive,
    );
  };

  useEffect(() => {
    persist(false);
  }, [main, egg, name, coverCardId, arts]);

  const play = () => {
    persist(true);
    onNav("lobby");
  };

  const handleImport = (text: string) => {
    const result = parseDeckList(text);
    setArts({});
    setMain(toCountMap(result.mainDeck));
    setEgg(toCountMap(result.eggDeck));
    setImporting(false);
  };

  const exportDeck = { ...deck, name, mainDeck: expand(main), eggDeck: expand(egg) };
  const exportText = serializeDeckList(exportDeck);

  const [page, setPage] = useState(1);

  const sortedPool = useMemo(() => {
    return sortCards(filter.filtered, filter.sort);
  }, [filter.filtered, filter.sort]);

  useEffect(() => {
    setPage(1);
  }, [filter.filtered]);

  const shownPool = sortedPool.slice(0, page * PAGE_SIZE);

  const onPoolScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (shownPool.length < sortedPool.length && el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
      setPage((p) => p + 1);
    }
  };

  return (
    <main className="deck-builder-page">
      {importing ? <DeckImportModal onImport={handleImport} onClose={() => setImporting(false)} /> : null}
      {exporting ? <DeckExportModal text={exportText} deck={exportDeck} onClose={() => setExporting(false)} /> : null}
      <FilterRail
        filter={filter}
        showCostFilter
        showRarityFilter
        showSort
        extra={<p className="deck-builder-hint">{t("deck.builderHint")}</p>}
      />

      <div className="deck-card-pool" onScroll={onPoolScroll}>
        <SectionHeading
          title={t("redesign.decks.editor.pool")}
          action={
            <span className="deck-card-pool__count">
              {t("common.cards", { count: sortedPool.length.toLocaleString() })}
            </span>
          }
        />
        <div className="deck-card-grid">
          {shownPool.map((card) => {
            const inDeck = (isEggCard(card) ? egg : main)[card.cardId] ?? 0;
            const cap = Math.min(card.maxCountInDeck, banlistLimit(card.cardId));
            return (
              <PoolCard
                key={card.cardId}
                cardId={card.cardId}
                inDeck={inDeck}
                atMax={sharedCardNumberCount(deckCardIds, card.cardId) >= cap}
                pairConflict={pairedCardIds.has(card.cardId)}
                onAdd={() => add(card.cardId)}
                onRemove={() => remove(card.cardId)}
                onOpen={() => {
                  setSel(card.cardId);
                }}
                selected={sel === card.cardId || inDeck > 0}
              />
            );
          })}
          {shownPool.length === 0 ? <div className="deck-card-pool__empty">{t("deck.emptyPool")}</div> : null}
        </div>
        {shownPool.length < sortedPool.length ? (
          <div className="deck-card-pool__more">{t("deck.scrollForMore")}</div>
        ) : null}
      </div>

      {deckInfoOpen ? (
        <button
          type="button"
          className="deck-info-backdrop"
          aria-label={t("common.close")}
          onClick={() => setDeckInfoOpen(false)}
        />
      ) : null}
      <aside className={`deck-current${deckInfoOpen ? " deck-current--open" : ""}`} aria-label={t("deck.detailsTitle")}>
        <div className="deck-info-sheet-handle">
          <span />
          <strong>{t("deck.detailsTitle")}</strong>
          <button type="button" aria-label={t("common.close")} onClick={() => setDeckInfoOpen(false)}>
            ×
          </button>
        </div>
        <Panel as="div" circuitNodes={false} className="deck-current__header">
          <input
            className="deck-current__name"
            aria-label={t("redesign.decks.editor.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="deck-current__counts">
            <CountChip label={t("deck.main")} count={mainCount} target={MAIN_TARGET} done={validMain} />
            <CountChip label={t("deck.egg")} count={eggCount} target={EGG_TARGET} done={eggCount === EGG_TARGET} />
          </div>
          <div className="deck-current__cover">
            <div className="deck-current__cover-thumb">
              <CoverThumb
                key={coverCardId}
                coverCardId={coverCardId}
                artId={coverCardId ? arts[coverCardId]?.[0] : undefined}
                sigilColor={dominantColor(expand(main))}
                sigilSize={22}
              />
            </div>
            <div className="deck-current__cover-text">
              <div className="aegis-hero-panel__eyebrow">{t("deck.cover")}</div>
              <div className="deck-current__cover-name" data-auto={!coverCardId}>
                {coverCardId ? (getCardDefinition(coverCardId)?.nameEn ?? coverCardId) : t("deck.coverAuto")}
              </div>
            </div>
            <button
              className="deck-current__random-cover"
              onClick={() => setCoverCardId(randomCoverCard(expand(main)))}
              disabled={mainCount === 0}
              title={t("deck.randomCover")}
            >
              <Icons.Dices size={15} />
            </button>
          </div>
        </Panel>

        <div className="deck-current__body">
          <DeckPreviewSections
            main={main}
            egg={egg}
            coverCardId={coverCardId}
            pairConflictCardIds={pairedCardIds}
            onSetCover={setCoverCardId}
            onAdd={add}
            onRemove={remove}
            arts={arts}
            onEditArt={(cardId) => setArtPickerCard(cardId)}
          />

          <div className="deck-current__stats">
            <DeckLevelCurve main={main} />
            <ColorBalance main={main} />
          </div>
        </div>

        <div className="deck-current__footer">
          {banlistViolations.length > 0 ? (
            <div className="deck-current__violations">
              <strong>{t("deck.banlistTitle")}</strong>
              {banlistViolations.map((v) => {
                const def = getCardDefinition(v.cardId);
                return (
                  <div key={v.cardId}>
                    {t("deck.banlistRow", { name: def?.nameEn ?? v.cardId, count: v.count, cap: v.cap })}
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="deck-current__row">
            <Button variant="ghost" size="sm" icon={Icons.Upload} onClick={() => setImporting(true)}>
              {t("common.import")}
            </Button>
            <Button variant="ghost" size="sm" icon={Icons.Download} onClick={() => setExporting(true)}>
              {t("common.export")}
            </Button>
          </div>
          <div className="deck-current__row">
            <Button variant="secondary" size="md" full icon={Icons.ArrowLeft} onClick={onClose}>
              {t("common.close")}
            </Button>
            <Button
              size="md"
              full
              icon={Icons.Swords}
              disabled={!validMain || banlistViolations.length > 0 || pairViolations.length > 0}
              onClick={play}
            >
              {t("common.play")}
            </Button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="deck-info-trigger"
        onClick={() => setDeckInfoOpen(true)}
        aria-expanded={deckInfoOpen}
      >
        <span>{t("deck.detailsCta")}</span>
        <span className="deck-info-trigger__counts">
          {mainCount}/{MAIN_TARGET} · {eggCount}/{EGG_TARGET}
        </span>
      </button>

      {artPickerCard ? (
        <DeckArtworkPicker
          key={artPickerCard}
          cardId={artPickerCard}
          arts={arts[artPickerCard] ?? []}
          count={main[artPickerCard] ?? egg[artPickerCard] ?? 0}
          onClose={() => setArtPickerCard(null)}
          onChoose={(artId, copy) =>
            setArts((previous) => ({
              ...previous,
              [artPickerCard]: (
                previous[artPickerCard] ??
                Array.from({ length: main[artPickerCard] ?? egg[artPickerCard] ?? 0 }, () => artPickerCard)
              ).map((current, index) => (copy === "all" || index === copy ? artId : current)),
            }))
          }
        />
      ) : null}
      {sel ? (
        <CardDetailDrawer
          key={sel}
          cardId={sel}
          artId={chosenArt[sel]}
          onArtChange={(artId) => {
            setChosenArt((previous) => ({ ...previous, [sel]: artId }));
          }}
          onClose={() => setSel(null)}
          footer={
            <div className="deck-drawer-actions">
              <Button full icon={Icons.Plus} disabled={isBanned(sel)} onClick={() => add(sel)}>
                {isBanned(sel) ? t("common.banned") : t("deck.addToDeck")}
              </Button>
              <Button
                full
                variant={coverCardId === sel ? "secondary" : "ghost"}
                icon={coverCardId === sel ? Icons.Check : Icons.Palette}
                onClick={() => setCoverCardId(sel)}
              >
                {coverCardId === sel ? t("deck.coverCard") : t("deck.setAsCover")}
              </Button>
            </div>
          }
        />
      ) : null}
    </main>
  );
}
