/* Deck Builder — list your decks, then edit one in a full builder: a filterable card
   pool on the left, the current 50-main + 5-egg list on the right with +/− steppers,
   a live cost curve and color balance, and the shared card-detail drawer. The 50/5
   targets and per-card copy limits (maxCountInDeck) are enforced as you build. Saved
   decks flow back to App state, so a build is immediately selectable for a match. */

import { useMemo, useState, useEffect, useRef } from "react";
import {
  bannedPairViolations,
  getCardDefinition,
  type CardDefinition,
  isBanned,
  restrictionLabel,
  effectiveCopyLimit as banlistLimit,
} from "@aegis/shared";
import { Button, ColorDot, Eyebrow, type Screen } from "../design/primitives";
import { CardFull, CoverThumb } from "../design/cards";
import { COLORS, colorKey, kindOf, type ColorName } from "../design/theme";
import { Icons } from "../design/icons";
import { CardDetailDrawer, FilterRail, sortCards, useCardFilter } from "./cardLibrary";
import {
  activeCollectionCards,
  createBlankDeck,
  displayCoverCard,
  dominantColor,
  parseDeckList,
  randomCoverCard,
  serializeDeckList,
  type DeckListing,
} from "../game/decks";
import { DeckLevelCurve, DeckPreviewSections } from "./deckPreview";
import { DeckListCard, deckLegality } from "./DeckListCard";
import { useTranslation } from "../i18n";
import "./deckBuilder.css";

const MAIN_TARGET = 50;
const EGG_TARGET = 5;
const PAGE_SIZE = 60;

type CountMap = Record<string, number>;

function toCountMap(cardIds: readonly string[]): CountMap {
  const map: CountMap = {};
  for (const id of cardIds) map[id] = (map[id] ?? 0) + 1;
  return map;
}
function expand(map: CountMap): string[] {
  const out: string[] = [];
  for (const [id, n] of Object.entries(map)) for (let i = 0; i < n; i += 1) out.push(id);
  return out;
}
const total = (map: CountMap): number => Object.values(map).reduce((a, b) => a + b, 0);
const isEggCard = (def: CardDefinition): boolean => kindOf(def) === "DigiEgg";

export function DeckBuilder({
  decks,
  activeDeckId,
  onSelectDeck,
  onSaveDeck,
  onNav,
}: {
  decks: DeckListing[];
  activeDeckId: string;
  onSelectDeck: (id: string) => void;
  onSaveDeck: (deck: DeckListing, setActive: boolean) => void;
  onNav: (s: Screen) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<DeckListing | null>(null);
  if (editing) {
    return <DeckEditor deck={editing} onSave={onSaveDeck} onClose={() => setEditing(null)} onNav={onNav} />;
  }
  return (
    <DeckList
      decks={decks}
      activeDeckId={activeDeckId}
      onEdit={setEditing}
      onNew={() => setEditing(createBlankDeck(decks, undefined, t("deck.newDeckName")))}
      onSelectDeck={onSelectDeck}
      onPlay={() => onNav("lobby")}
    />
  );
}

/* ---------------- deck list ---------------- */
function DeckList({
  decks,
  activeDeckId,
  onEdit,
  onNew,
  onSelectDeck,
  onPlay,
}: {
  decks: DeckListing[];
  activeDeckId: string;
  onEdit: (deck: DeckListing) => void;
  onNew: () => void;
  onSelectDeck: (id: string) => void;
  onPlay: () => void;
}) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);

  const handleImport = (text: string) => {
    const result = parseDeckList(text);
    const base = createBlankDeck(decks, undefined, t("deck.newDeckName"));
    onEdit({ ...base, mainDeck: result.mainDeck, eggDeck: result.eggDeck });
    setImporting(false);
  };

  return (
    <div
      className="deck-list-page"
      style={{
        position: "relative",
        padding: "28px 32px",
        height: "calc(100% - var(--ds-nav-height-wide))",
        overflowY: "auto",
      }}
    >
      <div
        className="deck-list-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}
      >
        <div>
          <Eyebrow>{t("deck.eyebrow")}</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--ds-font-display)",
              fontWeight: 800,
              fontSize: 32,
              margin: "10px 0 0",
              color: "var(--ds-foreground)",
            }}
          >
            {t("deck.title")}
          </h1>
        </div>
        <div className="deck-list-actions" style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" icon={Icons.Upload} onClick={() => setImporting(true)}>
            {t("common.import")}
          </Button>
          <Button icon={Icons.Plus} onClick={onNew}>
            {t("deck.new")}
          </Button>
        </div>
      </div>
      {importing ? <DeckImportModal onImport={handleImport} onClose={() => setImporting(false)} /> : null}
      {decks.length === 0 ? (
        <p className="deck-list-empty" role="status">
          {t("deck.empty")}
        </p>
      ) : null}
      <div className="deck-list-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
        {decks.map((d) => {
          const active = d.id === activeDeckId;
          const { legal } = deckLegality(d);
          return (
            <DeckListCard
              key={d.id}
              deck={d}
              active={active}
              actions={
                <>
                  <Button size="sm" variant="secondary" icon={Icons.FileText} onClick={() => onEdit(d)}>
                    {t("common.edit")}
                  </Button>
                  {active && legal ? (
                    <Button size="sm" icon={Icons.Swords} onClick={onPlay}>
                      {t("common.play")}
                    </Button>
                  ) : legal ? (
                    <Button size="sm" variant="ghost" onClick={() => onSelectDeck(d.id)}>
                      {t("deck.setActive")}
                    </Button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--ds-foreground-muted)", fontStyle: "italic" }}>
                      {t("deck.finishToUse")}
                    </span>
                  )}
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- editor ---------------- */
function DeckEditor({
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
      },
      setActive,
    );
  };

  useEffect(() => {
    persist(false);
  }, [main, egg, name, coverCardId]);

  const play = () => {
    persist(true);
    onNav("lobby");
  };

  const handleImport = (text: string) => {
    const result = parseDeckList(text);
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
                onOpen={() => setSel(card.cardId)}
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
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ds-border)" }}>
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

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          <DeckPreviewSections
            main={main}
            egg={egg}
            coverCardId={coverCardId}
            pairConflictCardIds={pairedCardIds}
            onSetCover={setCoverCardId}
            onAdd={add}
            onRemove={remove}
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

      {sel ? (
        <CardDetailDrawer
          cardId={sel}
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

function PoolCard({
  cardId,
  inDeck,
  atMax,
  pairConflict,
  onAdd,
  onRemove,
  onOpen,
  selected,
}: {
  cardId: string;
  inDeck: number;
  atMax: boolean;
  pairConflict: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onOpen: () => void;
  selected: boolean;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  const banLabel = pairConflict ? t("deck.pairBadge") : restrictionLabel(cardId);
  const banned = isBanned(cardId);
  const tintColor = banned || pairConflict ? "rgba(220,38,38,0.30)" : undefined;
  const hasCopies = inDeck > 0;
  return (
    <div
      style={{ position: "relative", display: "grid", placeItems: "center" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
        <CardFull
          cardId={cardId}
          width={132}
          selected={selected}
          count={hasCopies ? inDeck : undefined}
          dim={banned}
          onClick={() => {
            if (!banned && !atMax) onAdd();
          }}
        />
        {tintColor ? (
          <div
            style={{ position: "absolute", inset: 0, borderRadius: 8, background: tintColor, pointerEvents: "none" }}
          />
        ) : null}
      </div>
      {banLabel ? (
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            padding: "2px 6px",
            borderRadius: 4,
            background: banned || pairConflict ? "#dc2626" : "#f59e0b",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            lineHeight: 1.3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            zIndex: 2,
          }}
        >
          {banLabel}
        </div>
      ) : null}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        aria-label={t("deck.cardInfo")}
        title={t("deck.cardDetails")}
        style={{
          position: "absolute",
          top: 4,
          left: banLabel ? 48 : 4,
          width: 22,
          height: 22,
          borderRadius: 5,
          border: "none",
          background: "rgba(15,23,42,0.7)",
          color: "#fff",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
          opacity: hover ? 1 : 0,
          transition: "opacity 120ms",
          zIndex: 2,
        }}
      >
        ℹ
      </button>
      <div
        className="deck-pool-card-actions"
        style={{
          position: "absolute",
          inset: 0,
          opacity: hover ? 1 : 0,
          transition: "opacity 120ms",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: 8,
          pointerEvents: "none",
        }}
      >
        {hasCopies ? (
          <div className="deck-pool-card-stepper">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={t("common.remove")}
            >
              −
            </button>
            <span aria-label={`${inDeck}`}>{inDeck}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              aria-label={t("common.add")}
              disabled={atMax || banned}
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            disabled={atMax || banned}
            style={{
              pointerEvents: "auto",
              background: banned ? "var(--ds-surface-muted)" : atMax ? "var(--ds-surface-muted)" : "var(--ds-primary)",
              color: banned ? "var(--ds-foreground-disabled)" : atMax ? "var(--ds-foreground-muted)" : "#fff",
              border: "none",
              borderRadius: 9,
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: banned ? "not-allowed" : atMax ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              boxShadow: "var(--ds-shadow-md)",
            }}
          >
            <Icons.Plus size={14} />
            {banned ? t("common.banned") : atMax ? t("common.max") : t("common.add")}
          </button>
        )}
      </div>
    </div>
  );
}

function CountChip({ label, count, target, done }: { label: string; count: number; target: number; done: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--ds-font-mono)",
        fontSize: 12.5,
        color: done ? "var(--ds-success)" : "var(--ds-foreground-muted)",
        fontWeight: 600,
      }}
    >
      {done ? <Icons.CircleCheck size={14} /> : null}
      {label} {count}/{target}
    </span>
  );
}

/* ---------------- import / export modals ---------------- */
const modalOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 50,
  background: "rgba(15,23,42,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const modalPanel: React.CSSProperties = {
  background: "var(--ds-surface)",
  border: "1px solid var(--ds-border)",
  borderRadius: 18,
  padding: 28,
  width: 480,
  maxWidth: "90%",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxShadow: "var(--ds-shadow-lg)",
};
const modalTextarea: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 280,
  padding: 12,
  borderRadius: 10,
  border: "1px solid var(--ds-border-strong)",
  background: "var(--ds-surface-muted)",
  color: "var(--ds-foreground)",
  fontFamily: "var(--ds-font-mono)",
  fontSize: 12.5,
  lineHeight: 1.6,
  resize: "none",
  outline: "none",
};

function DeckImportModal({ onImport, onClose }: { onImport: (text: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  return (
    <div style={modalOverlay}>
      <div style={modalPanel}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--ds-font-display)",
            fontWeight: 800,
            fontSize: 22,
            color: "var(--ds-foreground)",
          }}
        >
          {t("deck.importTitle")}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ds-foreground-muted)" }}>
          {t("deck.importHint")}{" "}
          <code style={{ background: "var(--ds-surface-muted)", padding: "1px 5px", borderRadius: 4 }}>
            4 CardName BT1-009
          </code>
        </p>
        <textarea
          style={modalTextarea}
          autoFocus
          placeholder={"// DigimonCard.io Deck List\n4 Agumon BT1-009\n…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" icon={Icons.Upload} disabled={!text.trim()} onClick={() => onImport(text)}>
            {t("common.import")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeckExportModal({ text: deckText, onClose }: { text: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(deckText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={modalOverlay}>
      <div style={modalPanel}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--ds-font-display)",
            fontWeight: 800,
            fontSize: 22,
            color: "var(--ds-foreground)",
          }}
        >
          {t("deck.exportTitle")}
        </h2>
        <textarea
          style={modalTextarea}
          readOnly
          value={deckText}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button size="sm" icon={copied ? Icons.Check : Icons.Download} onClick={copy}>
            {copied ? t("common.copied") : t("common.copy")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ColorBalance({ main }: { main: CountMap }) {
  const { t } = useTranslation();
  const tally = new Map<ColorName, number>();
  for (const [id, n] of Object.entries(main)) {
    const def = getCardDefinition(id);
    if (!def) continue;
    for (const col of def.colors) {
      const key = colorKey(col);
      tally.set(key, (tally.get(key) ?? 0) + n);
    }
  }
  const entries = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const tot = entries.reduce((a, [, n]) => a + n, 0) || 1;
  return (
    <div>
      <div style={statLabel}>{t("deck.colorBalance")}</div>
      <div
        style={{
          height: 8,
          borderRadius: 99,
          overflow: "hidden",
          display: "flex",
          background: "var(--ds-surface-muted)",
        }}
      >
        {entries.map(([color, n]) => (
          <div key={color} style={{ width: `${(n / tot) * 100}%`, background: COLORS[color].base }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        {entries.map(([color, n]) => (
          <span
            key={color}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              color: "var(--ds-foreground-muted)",
            }}
          >
            <ColorDot color={color} size={9} />
            {color} {n}
          </span>
        ))}
        {entries.length === 0 ? (
          <span style={{ fontSize: 11.5, color: "var(--ds-foreground-disabled)", fontStyle: "italic" }}>—</span>
        ) : null}
      </div>
    </div>
  );
}

const statLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ds-foreground-muted)",
  marginBottom: 12,
};
