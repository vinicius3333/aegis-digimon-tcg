/* Collection — the full card gallery over the real @aegis/shared registry: a left
   filter rail (search + color + type), infinite scroll grid, and the shared detail
   drawer. Filtering runs over the whole set; cards load in pages as you scroll. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CardDefinition } from "@aegis/shared";
import { Eyebrow } from "../design/primitives";
import { CardFull } from "../design/cards";
import { activeCollectionCards } from "../game/decks";
import { CardDetailDrawer, FilterRail, useCardFilter } from "./cardLibrary";
import { useTranslation } from "../i18n";
import "./collection.css";

const PAGE_SIZE = 48;

export function Collection() {
  const { t } = useTranslation();
  const all = useMemo<CardDefinition[]>(() => activeCollectionCards(), []);
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
    <main className="collection-page" style={{ height: "calc(100% - var(--ds-nav-height-wide))", display: "flex", overflow: "hidden" }}>
      <header className="collection-header">
        <div>
          <Eyebrow>{t("collection.eyebrow")}</Eyebrow>
          <h1>{t("collection.title")}</h1>
        </div>
        <span>{t("collection.count", { count: filter.filtered.length.toLocaleString() })}</span>
      </header>

      <FilterRail filter={filter} />

      <div className="collection-results" style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}>
        {shown.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--ds-foreground-muted)" }}>{t("collection.empty")}</div>
        ) : (
          <div className="collection-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16, alignItems: "start" }}>
            {shown.map((c) => (
              <CardFull key={c.cardId} cardId={c.cardId} width={150} selected={selected === c.cardId} onClick={() => setSelected((s) => (s === c.cardId ? null : c.cardId))} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>

      {selected ? <CardDetailDrawer cardId={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}
