import { cardName } from "../design/theme";
import { useTranslation } from "../i18n";
import { CardArt } from "./overlay/CardArt";
import { resolvingProgress, timingText, type ChainEntry } from "./resolutionChain";
import "./resolutionStrip.css";

const THUMB_WIDTH = 26;

function EntryThumb({ entry, hiddenLabel }: { entry: ChainEntry; hiddenLabel: string }) {
  return entry.sourceCardId ? (
    <CardArt cardId={entry.sourceCardId} width={THUMB_WIDTH} />
  ) : (
    <span className="resolution-strip__hidden" aria-label={hiddenLabel} />
  );
}

/**
 * Which effect of a chain is resolving, which have resolved and which are still to come.
 * The strip leaves once the chain has settled. Sequential pacing only.
 */
export function ResolutionStrip({
  entries,
  folded = false,
}: {
  entries: readonly ChainEntry[] | null;
  /**
   * The portrait phone, whose folded narration band carries the count instead. Only the
   * spoken status is kept.
   */
  folded?: boolean;
}) {
  const { t } = useTranslation();
  const progress = resolvingProgress(entries);
  const hiddenLabel = t("resolution.hiddenCard");
  const nameOf = (entry: ChainEntry | undefined) =>
    `${entry?.sourceCardId ? cardName(entry.sourceCardId) : hiddenLabel}${entry?.count ? ` ×${entry.count}` : ""}`;

  if (progress && entries) {
    const spoken = t("resolution.progressSpoken", {
      position: progress.position,
      total: progress.total,
      card: nameOf(progress.current),
      timing: progress.current ? timingText(progress.current) : "",
    });
    const status = (
      <p className="resolution-strip__spoken" role="status" aria-live="polite">
        {spoken}
      </p>
    );
    if (folded)
      return (
        <section className="resolution-strip--folded" aria-label={t("resolution.label")}>
          {status}
        </section>
      );
    return (
      <section className="resolution-strip" aria-label={t("resolution.label")}>
        {status}
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
              {entry.count ? <span className="resolution-strip__count-badge">×{entry.count}</span> : null}
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

  return null;
}
