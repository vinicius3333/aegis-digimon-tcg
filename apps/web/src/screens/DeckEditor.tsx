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
} from "@aegis/shared";
import { Button, type Screen } from "../design/primitives";
import { CoverThumb } from "../design/cards";
import { Icons } from "../design/icons";
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

  const add = (cardId: string) => {
    const def = getCardDefinition(cardId);
    if (!def) return;
    if (isBanned(cardId)) return;
    const eggCard = isEggCard(def);
    const map = eggCard ? egg : main;
    const cur = map[cardId] ?? 0;
    const cap = Math.min(def.maxCountInDeck, banlistLimit(cardId));
    if (cur >= cap) return;
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
    return violations;
  }, [main, egg]);

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

  const exportText = serializeDeckList({ ...deck, mainDeck: expand(main), eggDeck: expand(egg) });

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
    <main
      className="deck-builder-page"
      style={{
        position: "relative",
        height: "calc(100% - var(--ds-nav-height-wide))",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {importing ? <DeckImportModal onImport={handleImport} onClose={() => setImporting(false)} /> : null}
      {exporting ? <DeckExportModal text={exportText} onClose={() => setExporting(false)} /> : null}
      <FilterRail
        filter={filter}
        showCostFilter
        showRarityFilter
        showSort
        extra={
          <>
            <div
              style={{
                padding: "12px 0",
                borderTop: "1px solid var(--ds-border)",
                fontSize: 12,
                color: "var(--ds-foreground-muted)",
                lineHeight: 1.5,
              }}
            >
              {t("deck.builderHint")}
            </div>
          </>
        }
      />

      {/* card pool */}
      <div
        className="deck-card-pool"
        onScroll={onPoolScroll}
        style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}
      >
        <div
          className="deck-card-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
            gap: 13,
            alignItems: "start",
          }}
        >
          {shownPool.map((card) => {
            const inDeck = (isEggCard(card) ? egg : main)[card.cardId] ?? 0;
            const cap = Math.min(card.maxCountInDeck, banlistLimit(card.cardId));
            return (
              <PoolCard
                key={card.cardId}
                cardId={card.cardId}
                inDeck={inDeck}
                atMax={inDeck >= cap}
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
          {shownPool.length === 0 ? (
            <div
              style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, color: "var(--ds-foreground-muted)" }}
            >
              {t("deck.emptyPool")}
            </div>
          ) : null}
        </div>
        {shownPool.length < sortedPool.length ? (
          <div
            style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 12, color: "var(--ds-foreground-muted)" }}
          >
            {t("deck.scrollForMore")}
          </div>
        ) : null}
      </div>

      {/* current deck */}
      {deckInfoOpen ? (
        <button
          type="button"
          className="deck-info-backdrop"
          aria-label={t("common.close")}
          onClick={() => setDeckInfoOpen(false)}
        />
      ) : null}
      <aside
        className={`deck-current${deckInfoOpen ? " deck-current--open" : ""}`}
        aria-label={t("deck.detailsTitle")}
        style={{
          width: 360,
          flexShrink: 0,
          borderLeft: "1px solid var(--ds-border)",
          background: "var(--ds-surface)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div className="deck-info-sheet-handle">
          <span />
          <strong>{t("deck.detailsTitle")}</strong>
          <button type="button" aria-label={t("common.close")} onClick={() => setDeckInfoOpen(false)}>
            ×
          </button>
        </div>
        <div
          className="deck-current__header"
          style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ds-border)" }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--ds-font-display)",
              fontWeight: 800,
              fontSize: 21,
              color: "var(--ds-foreground)",
              padding: 0,
            }}
          />
          <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
            <CountChip label={t("deck.main")} count={mainCount} target={MAIN_TARGET} done={validMain} />
            <CountChip label={t("deck.egg")} count={eggCount} target={EGG_TARGET} done={eggCount === EGG_TARGET} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <div
              style={{
                width: 36,
                height: 50,
                borderRadius: 6,
                overflow: "hidden",
                flexShrink: 0,
                border: "1px solid var(--ds-border)",
                background: "var(--ds-surface-muted)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CoverThumb
                key={coverCardId}
                coverCardId={coverCardId}
                artId={coverCardId ? arts[coverCardId]?.[0] : undefined}
                sigilColor={dominantColor(expand(main))}
                sigilSize={22}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ds-foreground-muted)",
                  marginBottom: 4,
                }}
              >
                {t("deck.cover")}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: coverCardId ? "var(--ds-foreground-secondary)" : "var(--ds-foreground-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {coverCardId ? (getCardDefinition(coverCardId)?.nameEn ?? coverCardId) : t("deck.coverAuto")}
              </div>
            </div>
            <button
              onClick={() => setCoverCardId(randomCoverCard(expand(main)))}
              disabled={mainCount === 0}
              title={t("deck.randomCover")}
              style={{
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "1px solid var(--ds-border)",
                background: "var(--ds-surface)",
                color: mainCount === 0 ? "var(--ds-foreground-disabled)" : "var(--ds-foreground-secondary)",
                cursor: mainCount === 0 ? "not-allowed" : "pointer",
              }}
            >
              <Icons.Dices size={15} />
            </button>
          </div>
        </div>

        <div className="deck-current__body" style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
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

          <div
            style={{
              marginTop: 18,
              padding: "16px 4px 4px",
              borderTop: "1px solid var(--ds-border)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <DeckLevelCurve main={main} />
            <ColorBalance main={main} />
          </div>
        </div>

        <div
          className="deck-current__footer"
          style={{
            padding: 16,
            borderTop: "1px solid var(--ds-border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {banlistViolations.length > 0 ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                fontSize: 12.5,
                color: "#991b1b",
                lineHeight: 1.5,
                marginBottom: 4,
              }}
            >
              <strong style={{ fontSize: 13 }}>{t("deck.banlistTitle")}</strong>
              {banlistViolations.map((v) => {
                const def = getCardDefinition(v.cardId);
                return (
                  <div key={v.cardId} style={{ marginTop: 4 }}>
                    {t("deck.banlistRow", { name: def?.nameEn ?? v.cardId, count: v.count, cap: v.cap })}
                  </div>
                );
              })}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" size="sm" icon={Icons.Upload} onClick={() => setImporting(true)}>
              {t("common.import")}
            </Button>
            <Button variant="ghost" size="sm" icon={Icons.Download} onClick={() => setExporting(true)}>
              {t("common.export")}
            </Button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
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
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
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
