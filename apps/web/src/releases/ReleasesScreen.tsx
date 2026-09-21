import { Icons } from "../design/icons";
import { Badge, Panel } from "../design/primitives";
import { useTranslation, type TranslationKey } from "../i18n";
import { allReleases, displayVersion, issueUrl, releaseUrl, type ReleaseItem } from "./catalog";
import "./releases.css";

export function ReleasesScreen() {
  const { locale, t } = useTranslation();
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "en";

  return (
    <main className="releases-page">
      <header className="releases-page__head">
        <span className="aegis-eyebrow">{t("releases.eyebrow")}</span>
        <h1>{t("releases.title")}</h1>
        <p>{t("releases.subtitle")}</p>
      </header>
      <div className="releases-list">
        {allReleases().map((release, index) => (
          <article key={release.version}>
            <Panel className="release" pad={24}>
              <header className="release__head">
                <div className="release__identity">
                  <Badge className="release__version" tone="warning">
                    {displayVersion(release.version)}
                  </Badge>
                  {index === 0 ? <span>{t("releases.current")}</span> : null}
                  <time dateTime={release.releasedAt}>
                    {new Intl.DateTimeFormat(dateLocale, { dateStyle: "long", timeZone: "UTC" }).format(
                      new Date(`${release.releasedAt}T00:00:00Z`),
                    )}
                  </time>
                </div>
                <a href={releaseUrl(release.version)} target="_blank" rel="noreferrer">
                  <span aria-hidden="true">
                    <Icons.Github size={18} />
                  </span>{" "}
                  {t("releases.github")}
                </a>
              </header>
              <p className="release__summary">{t(release.summaryKey as TranslationKey)}</p>
              {release.features.length ? (
                <ReleaseSection title={t("releases.features")} items={release.features} />
              ) : null}
              {release.fixes.length ? <ReleaseSection title={t("releases.fixes")} items={release.fixes} /> : null}
            </Panel>
          </article>
        ))}
      </div>
    </main>
  );
}

function ReleaseSection({ title, items }: { title: string; items: ReleaseItem[] }) {
  const { t } = useTranslation();
  return (
    <section className="release__section">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={`${item.textKey}:${item.issue ?? "none"}`}>
            <div>
              <p>{t(item.textKey as TranslationKey)}</p>
              {item.issue ? (
                <a className="release__reported" href={issueUrl(item.issue)} target="_blank" rel="noreferrer">
                  {t("releases.reported", { issue: item.issue })}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
