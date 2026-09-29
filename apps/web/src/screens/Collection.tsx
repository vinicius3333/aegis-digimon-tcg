/* Collection — the full card gallery over the real @aegis/shared registry: a hero
   with the library totals, a filter row (search, color, type, level, trait, set),
   an infinite-scroll grid, and the shared detail drawer. Filtering runs over the
   whole set; cards load in pages as you scroll. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CardDefinition } from "@aegis/shared";
import { getCardArts } from "@aegis/shared";
import { Eyebrow } from "../design/primitives";
import { Panel, SectionHeading, StatStrip } from "../design/surfaces";
import { CardFull } from "../design/cards";
import { activeCollectionCards } from "../game/decks";
import { CardDetailDrawer } from "./CardDetailDrawer";
import { FilterRail } from "./FilterRail";
import { useCardFilter } from "./cardFilters";
import { sortCards } from "./cardSorting";
import { useTranslation } from "../i18n";
import "./collection.css";

const PAGE_SIZE = 48;

export function Collection() {
  const { t } = useTranslation();
  const all = useMemo<CardDefinition[]>(() => sortCards(activeCollectionCards(), "releaseDate"), []);
  const filter = useCardFilter(all);
  const [selected, setSelected] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const totalRef = useRef(filter.filtered.length);
  totalRef.current = filter.filtered.length;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter.filtered]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((n) => (n >= totalRef.current ? n : n + PAGE_SIZE));
        }
      },
      { threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  const shown = filter.filtered.slice(0, visibleCount);

  return (
    <main className="collection-page">
      <div className="collection-results">
        <div className="collection-column">
          <Panel as="div" className="collection-hero">
            <div className="collection-header">
              <Eyebrow>{t("collection.eyebrow")}</Eyebrow>
              <h1 className="aegis-page-title">{t("collection.title")}</h1>
              <p className="aegis-hero-panel__muted">{t("redesign.collection.lede")}</p>
            </div>
            <StatStrip
              stats={[
                { label: t("redesign.collection.statCards"), value: all.length.toLocaleString() },
                { label: t("redesign.collection.statSets"), value: filter.availableSets.length },
                { label: t("redesign.collection.statMatching"), value: filter.filtered.length.toLocaleString() },
              ]}
            />
          </Panel>

          <section className="collection-filters" aria-labelledby="collection-filters-title">
            <SectionHeading id="collection-filters-title" title={t("mobile.filters")} />
            <FilterRail filter={filter} />
          </section>

          <section className="collection-section" aria-labelledby="collection-results-title">
            <SectionHeading
              id="collection-results-title"
              title={t("redesign.collection.results")}
              action={
                <span className="collection-count">
                  {t("collection.count", { count: filter.filtered.length.toLocaleString() })}
                </span>
              }
            />
            {shown.length === 0 ? (
              <p className="collection-empty">{t("collection.empty")}</p>
            ) : (
              <div className="collection-grid">
                {shown.map((c) => (
                  <div key={c.cardId} className="collection-card-entry">
                    <CardFull
                      cardId={c.cardId}
                      width={150}
                      selected={selected === c.cardId}
                      onClick={() => setSelected((s) => (s === c.cardId ? null : c.cardId))}
                    />
                    {getCardArts(c.cardId).length > 1 ? (
                      <button type="button" className="collection-art-count" onClick={() => setSelected(c.cardId)}>
                        {t("library.artworks")} · {getCardArts(c.cardId).length}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <div ref={sentinelRef} className="collection-sentinel" />
          </section>
        </div>
      </div>

      {selected ? <CardDetailDrawer cardId={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}
