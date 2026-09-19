/* The filter rail beside a card pool: color, kind, level, cost, rarity and text search. */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button, ColorDot } from "../design/primitives";
import { Icons } from "../design/icons";
import { COLORS, COLOR_KEYS } from "../design/theme";
import { useTranslation } from "../i18n";
import {
  CARD_SORTS,
  COST_FILTERS,
  CardFilter,
  CardSort,
  KIND_FILTERS,
  LEVEL_FILTERS,
  RARITY_FILTERS,
} from "./cardFilters";
import "./cardLibrary.css";

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
        className={`card-filter-rail${mobileFiltersOpen ? " is-mobile-open has-footer" : ""}`}
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
        {mobileFiltersOpen ? (
          <div className="card-filter-sheet-footer">
            <Button full onClick={() => setMobileFiltersOpen(false)}>
              {t("mobile.applyFilters", { count: filter.filtered.length })}
            </Button>
          </div>
        ) : null}
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
