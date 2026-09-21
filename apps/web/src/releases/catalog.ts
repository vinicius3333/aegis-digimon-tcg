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

const catalog = releases as Release[];

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
