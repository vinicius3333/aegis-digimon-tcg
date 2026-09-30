import { useEffect, useState } from "react";
import { cardName } from "../design/theme";
import { useTranslation } from "../i18n";
import { CardArt } from "./overlay/CardArt";
import { printedTimingLabel } from "./overlay/effectText";
import { RECAP_LIFETIME_MS, resolvingProgress, type ChainEntry, type ChainRecap } from "./resolutionChain";
import "./resolutionStrip.css";

const THUMB_WIDTH = 26;

function timingText(entry: ChainEntry): string {
  return printedTimingLabel(entry.timing) ?? entry.timing ?? "";
}

function EntryThumb({ entry, hiddenLabel }: { entry: ChainEntry; hiddenLabel: string }) {
  return entry.sourceCardId ? (
    <CardArt cardId={entry.sourceCardId} width={THUMB_WIDTH} />
  ) : (
    <span className="resolution-strip__hidden" aria-label={hiddenLabel} />
  );
}

/**
 * Which effect of a chain is resolving, which have resolved and which are still to come, and
 * once the chain is over a chip that reopens it in order. Sequential pacing only.
 */
export function ResolutionStrip({
  entries,
  recap,
  onDismissRecap,
}: {
  entries: readonly ChainEntry[] | null;
  recap: ChainRecap | null;
  onDismissRecap: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const progress = resolvingProgress(entries);
  const hiddenLabel = t("resolution.hiddenCard");
  const nameOf = (entry: ChainEntry | undefined) => (entry?.sourceCardId ? cardName(entry.sourceCardId) : hiddenLabel);

  useEffect(() => setExpanded(false), [recap]);
  useEffect(() => {
    // An open list is being read; it goes when the viewer closes it or the next chain starts.
    if (!recap || expanded) return;
    const timer = setTimeout(onDismissRecap, Math.max(0, recap.endedAt + RECAP_LIFETIME_MS - Date.now()));
    return () => clearTimeout(timer);
  }, [recap, expanded, onDismissRecap]);

  if (progress && entries) {
    const spoken = t("resolution.progressSpoken", {
      position: progress.position,
      total: progress.total,
      card: nameOf(progress.current),
      timing: progress.current ? timingText(progress.current) : "",
    });
    return (
      <section className="resolution-strip" aria-label={t("resolution.label")}>
        <p className="resolution-strip__spoken" role="status" aria-live="polite">
          {spoken}
        </p>
        <span className="resolution-strip__count" aria-hidden="true">
          {t("resolution.progress", { position: progress.position, total: progress.total })}
        </span>
        <ol className="resolution-strip__cards" aria-hidden="true">
          {entries.map((entry) => (
            <li
              key={entry.key}
              className="resolution-strip__card"
              data-status={entry.status}
              title={`${nameOf(entry)} ${timingText(entry)}`.trim()}
            >
              <EntryThumb entry={entry} hiddenLabel={hiddenLabel} />
            </li>
          ))}
        </ol>
        {progress.current ? (
          <span className="resolution-strip__current" aria-hidden="true">
            {nameOf(progress.current)} <em>{timingText(progress.current)}</em>
          </span>
        ) : null}
      </section>
    );
  }

  if (!recap) return null;
  return (
    <section className="resolution-strip resolution-strip--recap" aria-label={t("resolution.recapList")}>
      <button
        type="button"
        className="resolution-strip__chip"
        aria-expanded={expanded}
        onClick={() => (expanded ? onDismissRecap() : setExpanded(true))}
        title={expanded ? t("resolution.recapClose") : undefined}
      >
        {t("resolution.recap", { count: recap.entries.length })}
      </button>
      {expanded ? (
        <ol className="resolution-strip__recap">
          {recap.entries.map((entry) => (
            <li key={entry.key} className="resolution-strip__recap-entry">
              <EntryThumb entry={entry} hiddenLabel={hiddenLabel} />
              <span className="resolution-strip__recap-text">
                <strong>{nameOf(entry)}</strong> <em>{timingText(entry)}</em>
                {entry.description ? <span>{entry.description}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
