import { useEffect, useState } from "react";
import type { RoadmapItem } from "@aegis/shared/roadmap/roadmapTypes";
import { CommunityHubNav } from "@/community/CommunityHubNav";
import { CommunityHubSection } from "@/community/CommunityHubSection";
import { Icons } from "@/design/icons";
import { Alert, Button, Eyebrow } from "@/design/primitives";
import { Panel } from "@/design/surfaces";
import { useTranslation } from "@/i18n/useTranslation";
import { ROADMAP_COLUMN_LIMIT, ROADMAP_COLUMNS } from "@/roadmap/roadmapColumns";
import { roadmapClient } from "@/roadmap/roadmapClient";
import { RoadmapSupportButton } from "@/roadmap/RoadmapSupportButton";
import "@/screens/community/community.css";
import "@/roadmap/roadmap.css";

function summaryOf(description: string): string {
  return description.split(/\n\s*\n/)[0]!.trim();
}

type RoadmapBoardParams = {
  signedIn: boolean;
  onSignIn: () => void;
  onOpen: (id: number) => void;
  onDecks: () => void;
  onTournaments: () => void;
  onSuggest: () => void;
};

export function RoadmapBoard({ signedIn, onSignIn, onOpen, onDecks, onTournaments, onSuggest }: RoadmapBoardParams) {
  const { t } = useTranslation();
  const [items, setItems] = useState<RoadmapItem[]>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    roadmapClient
      .list(controller.signal)
      .then(setItems)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [revision]);
  const replace = (updated: RoadmapItem) =>
    setItems((current) => current?.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  return (
    <div className="community-page">
      <div className="community-column aegis-page-sheet">
        <Panel as="div" className="community-hero roadmap-hero">
          <div className="community-hero__header">
            <div className="community-hero__copy">
              <Eyebrow>{t("community.eyebrow")}</Eyebrow>
              <h1 className="aegis-page-title">{t("roadmap.title")}</h1>
              <p>{t("roadmap.subtitle")}</p>
            </div>
            <Button variant="secondary" icon={Icons.Lightbulb} onClick={onSuggest}>
              {t("roadmap.suggest")}
            </Button>
          </div>
          <CommunityHubNav
            section={CommunityHubSection.ROADMAP.value}
            onDecks={onDecks}
            onRoadmap={() => undefined}
            onTournaments={onTournaments}
          />
        </Panel>
        <p className="roadmap-note">{t("roadmap.note", { count: ROADMAP_COLUMN_LIMIT })}</p>
        {failed ? (
          <Alert tone="warning" title={t("roadmap.loadError")}>
            <Button variant="secondary" size="sm" onClick={() => setRevision((value) => value + 1)}>
              {t("roadmap.retry")}
            </Button>
          </Alert>
        ) : null}
        {!failed && !items ? <p role="status">{t("common.loading")}</p> : null}
        {items ? (
          <div className="roadmap-board">
            {ROADMAP_COLUMNS.map((column) => {
              const columnItems = items.filter((item) => item.status === column.status).slice(0, ROADMAP_COLUMN_LIMIT);
              return (
                <section
                  key={column.status}
                  className="roadmap-column"
                  aria-labelledby={`roadmap-column-${column.status}`}
                >
                  <header className="roadmap-column__header">
                    <h2 id={`roadmap-column-${column.status}`}>{t(column.label)}</h2>
                    <span className="roadmap-column__count" aria-hidden="true">
                      {columnItems.length}
                    </span>
                  </header>
                  {columnItems.length ? (
                    <ul>
                      {columnItems.map((item) => (
                        <li key={item.id} className="roadmap-card">
                          <a
                            className="roadmap-card__title"
                            href={`/roadmap/${item.id}`}
                            onClick={(event) => {
                              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
                              event.preventDefault();
                              onOpen(item.id);
                            }}
                          >
                            {item.title}
                          </a>
                          <p className="roadmap-card__description">{summaryOf(item.description)}</p>
                          <footer className="roadmap-card__footer">
                            <RoadmapSupportButton
                              item={item}
                              signedIn={signedIn}
                              onSignIn={onSignIn}
                              onChanged={replace}
                              onFailed={() => setFailed(true)}
                            />
                          </footer>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="roadmap-column__empty">{t("roadmap.empty")}</p>
                  )}
                </section>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
