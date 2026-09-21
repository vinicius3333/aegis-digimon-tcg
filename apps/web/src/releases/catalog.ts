import releases from "./releases.json";
import { GITHUB_REPO_URL } from "../community";
import type { Locale } from "../i18n/locales";

type LocalizedText = Record<Locale, string>;
export type ReleaseItem = { text: LocalizedText; issue?: number };
export type Release = {
  version: string;
  releasedAt: string;
  summary: LocalizedText;
  features: ReleaseItem[];
  fixes: ReleaseItem[];
};

function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    typeof value === "object" &&
    value !== null &&
    ["en", "pt-BR"].every((key) => typeof (value as Record<string, unknown>)[key] === "string")
  );
}

export function parseCatalog(value: unknown): Release[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("The release catalog is empty");
  return value.map((candidate) => {
    if (typeof candidate !== "object" || candidate === null) throw new Error("Invalid release entry");
    const release = candidate as Record<string, unknown>;
    if (typeof release.version !== "string" || !/^\d+\.\d+\.\d+-beta$/.test(release.version))
      throw new Error("Invalid release version");
    if (typeof release.releasedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(release.releasedAt))
      throw new Error("Invalid release date");
    if (!isLocalizedText(release.summary) || !Array.isArray(release.features) || !Array.isArray(release.fixes))
      throw new Error("Invalid localized release content");
    return release as Release;
  });
}

const catalog = parseCatalog(releases);

export function allReleases(): readonly Release[] {
  return catalog;
}

export function currentRelease(): Release {
  const release = catalog[0];
  if (!release) throw new Error("The release catalog is empty");
  return release;
}

export function displayVersion(version: string): string {
  return `v${version.replace(/-beta$/, "-BETA")}`;
}

export function releaseUrl(version: string): string {
  return `${GITHUB_REPO_URL}/releases/tag/${displayVersion(version)}`;
}

export function issueUrl(issue: number): string {
  return `${GITHUB_REPO_URL}/issues/${issue}`;
}
