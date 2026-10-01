import type { ReactNode } from "react";
import { Panel, SectionHeading } from "../design/surfaces";
import { useTranslation, type TranslationKey } from "../i18n";
import { allReleases, displayVersion, issueUrl, type Release, type ReleaseItem } from "./catalog";
import "./releases.css";

export function ReleasesScreen() {
  const { t } = useTranslation();
  const [latest, ...earlier] = allReleases();

  return (
    <main className="releases-page">
      <header className="releases-page__head">
        <span className="aegis-eyebrow">{t("releases.eyebrow")}</span>
        <h1>{t("releases.title")}</h1>
        <p>{t("releases.subtitle")}</p>
      </header>
      <div className="releases-list">
        {latest ? (
          <Panel as="article" className="release release--latest">
            <ReleaseEntry release={latest} current />
          </Panel>
        ) : null}
        {earlier.map((release) => (
          <article key={release.version} className="release release--archived">
            <ReleaseEntry release={release} />
          </article>
        ))}
      </div>
    </main>
  );
}

function ReleaseEntry({ release, current = false }: { release: Release; current?: boolean }) {
  const { locale, t } = useTranslation();
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "en";

  return (
    <>
      <header className="release__head">
        <h2 className="release__version">{displayVersion(release.version)}</h2>
        {current ? <span className="release__current">{t("releases.current")}</span> : null}
        <time dateTime={release.releasedAt}>
          {new Intl.DateTimeFormat(dateLocale, { dateStyle: "long", timeZone: "UTC" }).format(
            new Date(`${release.releasedAt}T00:00:00Z`),
          )}
        </time>
      </header>
      <p className="release__summary">{t(release.summaryKey as TranslationKey)}</p>
      {release.features.length ? <ReleaseSection title={t("releases.features")} items={release.features} /> : null}
      {release.fixes.length ? <ReleaseSection title={t("releases.fixes")} items={release.fixes} /> : null}
    </>
  );
}

function ReleaseSection({ title, items }: { title: ReactNode; items: ReleaseItem[] }) {
  const { t } = useTranslation();
  return (
    <section className="release__section">
      <SectionHeading title={title} level={3} />
      <ul>
        {items.map((item) => (
          <li key={`${item.textKey}:${item.issue ?? "none"}`}>
            <p>{t(item.textKey as TranslationKey)}</p>
            {item.issue ? (
              <a className="release__reported" href={issueUrl(item.issue)} target="_blank" rel="noreferrer">
                {t("releases.reported", { issue: item.issue })}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
