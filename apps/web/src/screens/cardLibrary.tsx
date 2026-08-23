/* Shared card-library pieces — the search/color/type filter rail and the card detail
   drawer. The Collection and the Deck Builder both render the real @aegis/shared
   registry through these (one filter rail, one detail drawer, two screens). */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  effectiveCopyLimit,
  getCardDefinition,
  restrictionLabel,
  type CardColor,
  type CardDefinition,
} from "@aegis/shared";
import { Button, ColorDot, Eyebrow } from "../design/primitives";
import { CardFull } from "../design/cards";
import { Icons } from "../design/icons";
import { COLORS, COLOR_KEYS, colorKey, formLabel, kindOf, type ColorName } from "../design/theme";
import { useTranslation } from "../i18n";
import "./cardLibrary.css";

export const KIND_FILTERS = ["Digimon", "DigiEgg", "Tamer", "Option"] as const;
export const LEVEL_FILTERS = [2, 3, 4, 5, 6, 7] as const;
export const COST_FILTERS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
export const RARITY_FILTERS = ["C", "U", "R", "SR", "UR", "SEC", "P", "-"] as const;
export const CARD_SORTS = ["name", "dp", "level", "playCost", "type", "cardNumber", "random"] as const;
export type KindFilter = (typeof KIND_FILTERS)[number];
export type LevelFilter = (typeof LEVEL_FILTERS)[number];
export type CostFilter = (typeof COST_FILTERS)[number];
export type RarityFilter = (typeof RARITY_FILTERS)[number];
export type CardSort = (typeof CARD_SORTS)[number];
export type ColorFilterMode = "any" | "all";

export function matchesColorFilter({
  cardColors,
  selectedColors,
  mode,
}: {
  cardColors: readonly CardColor[];
  selectedColors: readonly ColorName[];
  mode: ColorFilterMode;
}): boolean {
  if (selectedColors.length === 0) return true;
  const hasColor = (selectedColor: ColorName): boolean =>
    cardColors.some((cardColor) => colorKey(cardColor) === selectedColor);
  return mode === "all" ? selectedColors.every(hasColor) : selectedColors.some(hasColor);
}

export function matchesLevelFilter(cardLevel: number | undefined, selectedLevels: readonly LevelFilter[]): boolean {
  return selectedLevels.length === 0 || selectedLevels.some((level) => level === cardLevel);
}

/** The final cost chip is a 7-or-more bucket, so high-cost cards remain discoverable. */
export function matchesCostFilter(playCost: number, selectedCosts: readonly CostFilter[]): boolean {
  return (
    selectedCosts.length === 0 || selectedCosts.some((cost) => (cost === 7 ? playCost >= cost : playCost === cost))
  );
}

export function matchesRarityFilter(
  cardRarity: string | undefined,
  selectedRarities: readonly RarityFilter[],
): boolean {
  return selectedRarities.length === 0 || selectedRarities.some((rarity) => rarity === cardRarity);
}

export function matchesTraitOrAttributeFilter(
  card: Pick<CardDefinition, "types" | "attributes">,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [...(card.types ?? []), ...(card.attributes ?? [])].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

// Chronological EN release order — higher index = more recent.
// Source: world.digimoncard.com / en.digimoncard.com official release events.
const SET_RELEASE_ORDER: Record<string, number> = {
  ST1: 1,
  ST2: 2,
  ST3: 3,
  BT1: 4,
  BT2: 5,
  BT3: 6,
  ST4: 7,
  ST5: 8,
  ST6: 9,
  BT4: 10,
  BT5: 11,
  ST7: 12,
  ST8: 13,
  BT6: 14,
  EX1: 15,
  BT7: 16,
  ST9: 17,
  ST10: 18,
  BT8: 19,
  EX2: 20,
  BT9: 21,
  ST12: 22,
  ST13: 23,
  BT10: 24,
  EX3: 25,
  BT11: 26,
  BT12: 27,
  ST14: 28,
  EX4: 29,
  RB1: 30,
  BT13: 31,
  ST15: 32,
  ST16: 33,
  BT14: 34,
  EX5: 35,
  BT15: 36,
  ST17: 37,
  BT16: 38,
  EX6: 39,
  BT17: 40,
  ST18: 41,
  ST19: 42,
  EX7: 43,
  BT18: 44,
  EX8: 45,
  BT19: 46,
  BT20: 47,
  ST20: 48,
  ST21: 49,
  BT21: 50,
  EX9: 51,
  BT22: 52,
  EX10: 53,
  BT23: 54,
  ST22: 55,
  BT24: 56,
  EX11: 57,
  ST23: 58,
  ST24: 59,
  AD1: 60,
  BT25: 61,
  EX12: 62,
};

// Sets with no single release date — always sorted to the bottom.
const MISC_SETS: Record<string, number> = { LM: 1, P: 2 };

// Approximate EN release year per promo (set "P"), keyed by the highest P-NNN of
// each year's wave. Boundaries are derived from which promo pack contains each
// range (Bandai does not publish a per-card release date), so edges are fuzzy.
// Anchors: Promotion Pack Ver.0.0 = 2021 launch; 1st Anniversary = 2022;
// 3rd Anniversary Update Pack (BT-13) = 2023; Adventure 02 + Update Pack (BT-17)
// = 2024; Tamer Battle Pack 26 = Jan 2025.
const PROMO_YEAR_BANDS: ReadonlyArray<readonly [maxNumber: number, year: number]> = [
  [28, 2021],
  [90, 2022],
  [116, 2023],
  [142, 2024],
  [Infinity, 2025],
];

function promoYear(cardId: string): number {
  const n = cardNumber(cardId);
  return (PROMO_YEAR_BANDS.find(([max]) => n <= max) ?? [0, 2025])[1];
}

// Most-recent-first: negate release index so highest index sorts first.
// Misc sets (promos, limited packs spanning multiple eras) go after all dated sets.
function collectionOrder(set: string): number {
  const s = set.toUpperCase();
  const order = SET_RELEASE_ORDER[s];
  if (order !== undefined) return -order;
  const misc = MISC_SETS[s];
  return misc !== undefined ? 900000 + misc : 999999;
}

function cardNumber(cardId: string): number {
  const dash = cardId.lastIndexOf("-");
  return dash > 0 ? parseInt(cardId.slice(dash + 1), 10) : 0;
}

// Within a collection group, promos cluster newest-year-first; everything else
// keeps ascending card number.
function withinCollectionOrder(idA: string, setA: string, idB: string, setB: string): number {
  if (setA.toUpperCase() === "P" && setB.toUpperCase() === "P") {
    const yearDiff = promoYear(idB) - promoYear(idA);
    if (yearDiff !== 0) return yearDiff;
  }
  return cardNumber(idA) - cardNumber(idB);
}

export function sortByCollection(cards: readonly CardDefinition[]): CardDefinition[] {
  return [...cards].sort((a, b) => {
    const diff = collectionOrder(a.set) - collectionOrder(b.set);
    if (diff !== 0) return diff;
    return withinCollectionOrder(a.cardId, a.set, b.cardId, b.set);
  });
}

function compareNumbers(a: number | undefined, b: number | undefined): number {
  return (a ?? Infinity) - (b ?? Infinity);
}

/** Sorts the card pool for browsing; random order is reshuffled when selected. */
export function sortCards(cards: readonly CardDefinition[], sort: CardSort): CardDefinition[] {
  const sorted = [...cards];
  if (sort === "random") {
    for (let i = sorted.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!];
    }
    return sorted;
  }
  return sorted.sort((a, b) => {
    if (sort === "dp") return compareNumbers(a.dp, b.dp) || a.nameEn.localeCompare(b.nameEn);
    if (sort === "level") return compareNumbers(a.level, b.level) || a.nameEn.localeCompare(b.nameEn);
    if (sort === "playCost") return compareNumbers(a.playCost, b.playCost) || a.nameEn.localeCompare(b.nameEn);
    if (sort === "type") return kindOf(a).localeCompare(kindOf(b)) || a.nameEn.localeCompare(b.nameEn);
    if (sort === "cardNumber") return a.cardId.localeCompare(b.cardId, undefined, { numeric: true });
    return a.nameEn.localeCompare(b.nameEn);
  });
}

export function sortCardIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const setA = a.split("-")[0] ?? "";
    const setB = b.split("-")[0] ?? "";
    const diff = collectionOrder(setA) - collectionOrder(setB);
    if (diff !== 0) return diff;
    return withinCollectionOrder(a, setA, b, setB);
  });
}

export interface CardFilter {
  query: string;
  setQuery: (v: string) => void;
  colors: ColorName[];
  kinds: KindFilter[];
  levels: LevelFilter[];
  costs: CostFilter[];
  rarities: RarityFilter[];
  sort: CardSort;
  traitQuery: string;
  setTraitQuery: (v: string) => void;
  set: string;
  setSet: (v: string) => void;
  availableSets: string[];
  filtered: CardDefinition[];
  toggleColor: (v: ColorName) => void;
  toggleKind: (v: KindFilter) => void;
  toggleLevel: (v: LevelFilter) => void;
  toggleCost: (v: CostFilter) => void;
  toggleRarity: (v: RarityFilter) => void;
  setSort: (v: CardSort) => void;
  clear: () => void;
}

/** Search + color + kind + level + trait/attribute + set filter state over a card list. */
export function useCardFilter(
  all: readonly CardDefinition[],
  { colorFilterMode = "any" }: { colorFilterMode?: ColorFilterMode } = {},
): CardFilter {
  const [query, setQuery] = useState("");
  const [colors, setColors] = useState<ColorName[]>([]);
  const [kinds, setKinds] = useState<KindFilter[]>([]);
  const [levels, setLevels] = useState<LevelFilter[]>([]);
  const [costs, setCosts] = useState<CostFilter[]>([]);
  const [rarities, setRarities] = useState<RarityFilter[]>([]);
  const [sort, setSort] = useState<CardSort>("name");
  const [traitQuery, setTraitQuery] = useState("");
  const [set, setSet] = useState("");

  const availableSets = useMemo(() => {
    const seen = new Set<string>();
    for (const c of all) seen.add(c.set);
    return [...seen].sort((a, b) => collectionOrder(a) - collectionOrder(b));
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((c) => {
      if (q && !c.nameEn.toLowerCase().includes(q) && !c.cardId.toLowerCase().includes(q)) return false;
      if (!matchesColorFilter({ cardColors: c.colors, selectedColors: colors, mode: colorFilterMode })) return false;
      if (kinds.length && !kinds.includes(kindOf(c) as KindFilter)) return false;
      if (!matchesLevelFilter(c.level, levels)) return false;
      if (!matchesCostFilter(c.playCost, costs)) return false;
      if (!matchesRarityFilter(c.rarity, rarities)) return false;
      if (!matchesTraitOrAttributeFilter(c, traitQuery)) return false;
      if (set && c.set !== set) return false;
      return true;
    });
  }, [all, query, colors, kinds, levels, costs, rarities, traitQuery, set, colorFilterMode]);

  return {
    query,
    setQuery,
    colors,
    kinds,
    levels,
    costs,
    rarities,
    sort,
    traitQuery,
    setTraitQuery,
    set,
    setSet,
    availableSets,
    filtered,
    toggleColor: (v) => setColors((cs) => (cs.includes(v) ? cs.filter((x) => x !== v) : [...cs, v])),
    toggleKind: (v) => setKinds((ks) => (ks.includes(v) ? ks.filter((x) => x !== v) : [...ks, v])),
    toggleLevel: (v) => setLevels((ls) => (ls.includes(v) ? ls.filter((x) => x !== v) : [...ls, v])),
    toggleCost: (v) => setCosts((cs) => (cs.includes(v) ? cs.filter((x) => x !== v) : [...cs, v])),
    toggleRarity: (v) => setRarities((rs) => (rs.includes(v) ? rs.filter((x) => x !== v) : [...rs, v])),
    setSort,
    clear: () => {
      setQuery("");
      setColors([]);
      setKinds([]);
      setLevels([]);
      setCosts([]);
      setRarities([]);
      setTraitQuery("");
      setSet("");
    },
  };
}

/* ---------- the shared left filter rail ---------- */
export function FilterRail({
  filter,
  extra,
  showCostFilter = false,
  showRarityFilter = false,
  showSort = false,
}: {
  filter: CardFilter;
  extra?: ReactNode;
  showCostFilter?: boolean;
  showRarityFilter?: boolean;
  showSort?: boolean;
}) {
  const { t } = useTranslation();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const sheetId = useId();
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    sheetRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [mobileFiltersOpen]);

  return (
    <>
      <Button
        className="card-filter-trigger"
        variant="secondary"
        icon={Icons.Filter}
        aria-controls={sheetId}
        aria-expanded={mobileFiltersOpen}
        onClick={() => setMobileFiltersOpen(true)}
      >
        {t("mobile.filters")}
      </Button>
      {mobileFiltersOpen ? (
        <button
          type="button"
          className="card-filter-sheet-backdrop"
          aria-label={t("common.close")}
          onClick={() => setMobileFiltersOpen(false)}
        />
      ) : null}
      <aside
        ref={sheetRef}
        id={sheetId}
        className={`card-filter-rail${mobileFiltersOpen ? " is-mobile-open" : ""}`}
        role={mobileFiltersOpen ? "dialog" : undefined}
        aria-modal={mobileFiltersOpen || undefined}
        aria-labelledby={mobileFiltersOpen ? `${sheetId}-title` : undefined}
        tabIndex={mobileFiltersOpen ? -1 : undefined}
        style={{
          width: 236,
          flexShrink: 0,
          borderRight: "1px solid var(--ds-border)",
          background: "var(--ds-surface)",
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div className="card-filter-sheet-header">
          <h2 id={`${sheetId}-title`}>{t("mobile.filters")}</h2>
          <button type="button" aria-label={t("common.close")} onClick={() => setMobileFiltersOpen(false)}>
            ×
          </button>
        </div>
        <div style={{ position: "relative" }}>
          <Icons.Search
            size={15}
            style={{ position: "absolute", left: 11, top: 10, color: "var(--ds-foreground-muted)" }}
          />
          <input
            aria-label={t("library.searchPlaceholder")}
            name="cardSearch"
            autoComplete="off"
            value={filter.query}
            onChange={(e) => filter.setQuery(e.target.value)}
            placeholder={t("library.searchPlaceholder")}
            style={{
              width: "100%",
              padding: "8px 10px 8px 32px",
              borderRadius: 10,
              border: "1px solid var(--ds-border-strong)",
              background: "var(--ds-background)",
              color: "var(--ds-foreground)",
              fontSize: 13.5,
              fontFamily: "var(--ds-font-sans)",
              outline: "none",
            }}
          />
        </div>

        <div>
          <div style={railLabel}>{t("library.color")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {COLOR_KEYS.map((col) => {
              const on = filter.colors.includes(col);
              const c = COLORS[col];
              return (
                <button
                  key={col}
                  onClick={() => filter.toggleColor(col)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 9,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--ds-font-sans)",
                    background: on ? c.soft : "var(--ds-surface-muted)",
                    border: `1px solid ${on ? c.base : "var(--ds-border)"}`,
                    color: on ? "var(--ds-foreground)" : "var(--ds-foreground-muted)",
                  }}
                >
                  <ColorDot color={col} size={10} />
                  {col}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={railLabel}>{t("library.cardType")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {KIND_FILTERS.map((k) => {
              const on = filter.kinds.includes(k);
              return (
                <button
                  key={k}
                  onClick={() => filter.toggleKind(k)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 9,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--ds-font-sans)",
                    background: on ? "var(--ds-primary-light)" : "var(--ds-surface-muted)",
                    border: `1px solid ${on ? "var(--ds-primary)" : "var(--ds-border)"}`,
                    color: on ? "var(--ds-primary)" : "var(--ds-foreground-muted)",
                  }}
                >
                  {t(`library.kind.${k}` as const)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={railLabel}>{t("library.level")}</div>
          <div role="group" aria-label={t("library.level")} style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {LEVEL_FILTERS.map((level) => {
              const on = filter.levels.includes(level);
              return (
                <button
                  key={level}
                  onClick={() => filter.toggleLevel(level)}
                  aria-pressed={on}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 9,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--ds-font-sans)",
                    background: on ? "var(--ds-primary-light)" : "var(--ds-surface-muted)",
                    border: `1px solid ${on ? "var(--ds-primary)" : "var(--ds-border)"}`,
                    color: on ? "var(--ds-primary)" : "var(--ds-foreground-muted)",
                  }}
                >
                  Lv. {level}
                </button>
              );
            })}
          </div>
        </div>

        {showCostFilter ? (
          <div>
            <div style={railLabel}>{t("library.playCost")}</div>
            <div role="group" aria-label={t("library.playCost")} style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {COST_FILTERS.map((cost) => {
                const on = filter.costs.includes(cost);
                return (
                  <button
                    key={cost}
                    onClick={() => filter.toggleCost(cost)}
                    aria-pressed={on}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 9,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--ds-font-sans)",
                      background: on ? "var(--ds-primary-light)" : "var(--ds-surface-muted)",
                      border: `1px solid ${on ? "var(--ds-primary)" : "var(--ds-border)"}`,
                      color: on ? "var(--ds-primary)" : "var(--ds-foreground-muted)",
                    }}
                  >
                    {cost === 7 ? "7+" : cost}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {showRarityFilter ? (
          <div>
            <div style={railLabel}>{t("library.rarity")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {RARITY_FILTERS.map((rarity) => {
                const on = filter.rarities.includes(rarity);
                return (
                  <button
                    key={rarity}
                    onClick={() => filter.toggleRarity(rarity)}
                    aria-pressed={on}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 9,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--ds-font-sans)",
                      background: on ? "var(--ds-primary-light)" : "var(--ds-surface-muted)",
                      border: `1px solid ${on ? "var(--ds-primary)" : "var(--ds-border)"}`,
                      color: on ? "var(--ds-primary)" : "var(--ds-foreground-muted)",
                    }}
                  >
                    {rarity}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {showSort ? (
          <div>
            <div style={railLabel}>{t("library.sort")}</div>
            <select
              value={filter.sort}
              onChange={(e) => filter.setSort(e.target.value as CardSort)}
              aria-label={t("library.sort")}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid var(--ds-border-strong)",
                background: "var(--ds-background)",
                color: "var(--ds-foreground)",
                fontSize: 13,
                fontFamily: "var(--ds-font-sans)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {CARD_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {t(`library.sort.${sort}` as const)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <div style={railLabel}>{t("library.traitAttribute")}</div>
          <input
            name="traitSearch"
            autoComplete="off"
            value={filter.traitQuery}
            onChange={(e) => filter.setTraitQuery(e.target.value)}
            aria-label={t("library.traitAttribute")}
            placeholder={t("library.traitAttributePlaceholder")}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid var(--ds-border-strong)",
              background: "var(--ds-background)",
              color: "var(--ds-foreground)",
              fontSize: 13.5,
              fontFamily: "var(--ds-font-sans)",
              outline: "none",
            }}
          />
        </div>

        <div>
          <div style={railLabel}>{t("library.set")}</div>
          <select
            aria-label={t("library.set")}
            name="cardSet"
            value={filter.set}
            onChange={(e) => filter.setSet(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid var(--ds-border-strong)",
              background: "var(--ds-background)",
              color: "var(--ds-foreground)",
              fontSize: 13,
              fontFamily: "var(--ds-font-sans)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">{t("library.allSets")}</option>
            {filter.availableSets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {extra}

        <button
          onClick={filter.clear}
          style={{
            marginTop: "auto",
            padding: 8,
            borderRadius: 9,
            border: "1px solid var(--ds-border)",
            background: "transparent",
            color: "var(--ds-foreground-muted)",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Icons.Filter size={14} />
          {t("library.clearFilters")}
        </button>
      </aside>
    </>
  );
}

const railLabel = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--ds-foreground-muted)",
  marginBottom: 11,
};

/* ---------- the shared right detail drawer ---------- */
export function CardDetailDrawer({
  cardId,
  onClose,
  footer,
}: {
  cardId: string;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const def = getCardDefinition(cardId);
  if (!def) return null;
  const isDigi = kindOf(def) === "Digimon";
  const copyLimit = effectiveCopyLimit(cardId);
  const banLabel = restrictionLabel(cardId);
  return (
    <aside
      aria-labelledby="card-detail-title"
      aria-modal="true"
      className="card-detail-drawer"
      role="dialog"
      style={{
        width: 372,
        flexShrink: 0,
        borderLeft: "1px solid var(--ds-border)",
        background: "var(--ds-surface)",
        padding: 22,
        overflowY: "auto",
        animation: "aegis-rise 200ms ease-out",
      }}
    >
      <div
        className="card-detail-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}
      >
        <div id="card-detail-title">
          <Eyebrow color="var(--ds-foreground-muted)">{t("library.cardDetail")}</Eyebrow>
        </div>
        <button aria-label={t("common.close")} className="card-detail-close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="card-detail-overview">
        <div className="card-detail-preview">
          <CardFull cardId={def.cardId} width={228} />
        </div>
        <div className="card-detail-summary">
          <div className="card-detail-limit">
            {banLabel ? (
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#f59e0b",
                  color: "#fff",
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {banLabel}
              </span>
            ) : null}
            <span style={{ fontFamily: "var(--ds-font-mono)", fontSize: 12, color: "var(--ds-foreground-muted)" }}>
              {t("library.maxPerDeck", { count: copyLimit })}
            </span>
          </div>
          <div className="card-detail-metadata">
            <DetailRow label={t("library.rowSet")} value={def.set} mono />
            <DetailRow label={t("library.rowColor")} value={def.colors.join(" / ")} />
            <DetailRow label={t("library.rowType")} value={formLabel(def)} />
            <DetailRow label={t("library.rowPlayCost")} value={def.playCost < 0 ? "—" : String(def.playCost)} mono />
            {isDigi ? <DetailRow label={t("library.rowDp")} value={def.dp.toLocaleString()} mono /> : null}
            {def.types && def.types.length ? (
              <DetailRow label={t("library.rowTraits")} value={def.types.join(", ")} />
            ) : null}
            {def.rarity ? <DetailRow label={t("library.rowRarity")} value={def.rarity} mono /> : null}
          </div>
        </div>
      </div>
      <div className="card-detail-effects">
        <DetailEffect title={t("library.mainEffect")} text={def.effectText} />
        <DetailEffect title={t("library.inheritedEffect")} text={def.inheritedEffectText} tone="var(--ds-warning)" />
        <DetailEffect title={t("library.securityEffect")} text={def.securityEffectText} tone="var(--ds-success)" />
        {footer}
      </div>
    </aside>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div
      className="card-detail-row"
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 0",
        borderBottom: "1px solid var(--ds-border)",
      }}
    >
      <span style={{ fontSize: 12.5, color: "var(--ds-foreground-muted)" }}>{label}</span>
      <span
        style={{
          fontSize: 12.5,
          color: "var(--ds-foreground)",
          fontWeight: 500,
          fontFamily: mono ? "var(--ds-font-mono)" : "inherit",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DetailEffect({ title, text, tone }: { title: string; text?: string; tone?: string }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: tone ?? "var(--ds-primary)",
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--ds-foreground-secondary)",
          whiteSpace: "pre-line",
        }}
      >
        {readableEffectText(text)}
      </p>
    </div>
  );
}

/**
 * Historical catalog text sometimes joins independent printed clauses without a
 * space (for example BT9-109's `cards.[When Attacking]`). Preserve adjacent
 * multi-timing headers while giving punctuation-delimited clauses a visible line.
 */
export function readableEffectText(text: string): string {
  return text
    .replace(/([.\]])(?=＜)/g, "$1\n")
    .replace(/([.!?])(?=\[[^\]]+\])/g, "$1\n")
    .replace(/([^\]\s])(?=\[(?:All Turns|Your Turn|Opponent's Turn|When |On |Main\]|Security\]|Start |End ))/g, "$1\n");
}
