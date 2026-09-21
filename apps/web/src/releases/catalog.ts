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
  const seen = new Set<string>();
  return value.map((candidate, index) => {
    if (typeof candidate !== "object" || candidate === null) throw new Error("Invalid release entry");
    const release = candidate as Record<string, unknown>;
    if (!hasOnlyKeys(release, ["features", "fixes", "releasedAt", "summary", "version"]))
      throw new Error("Unknown release fields");
    if (typeof release.version !== "string" || !/^\d+\.\d+\.\d+-beta$/.test(release.version))
      throw new Error("Invalid release version");
    if (seen.has(release.version)) throw new Error("Duplicate release version");
    if (index > 0 && compareVersions(value[index - 1], release.version) <= 0)
      throw new Error("Releases must be newest first");
    seen.add(release.version);
    if (
      typeof release.releasedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(release.releasedAt) ||
      new Date(`${release.releasedAt}T00:00:00Z`).toISOString().slice(0, 10) !== release.releasedAt
    )
      throw new Error("Invalid release date");
    if (!isLocalizedText(release.summary) || !Array.isArray(release.features) || !Array.isArray(release.fixes))
      throw new Error("Invalid localized release content");
    for (const item of [...release.features, ...release.fixes]) validateItem(item);
    return release as Release;
  });
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => key in value);
}

function validateItem(value: unknown): asserts value is ReleaseItem {
  if (typeof value !== "object" || value === null) throw new Error("Invalid release item");
  const item = value as Record<string, unknown>;
  if (!hasOnlyKeys(item, item.issue === undefined ? ["text"] : ["issue", "text"]))
    throw new Error("Unknown release item fields");
  if (!isLocalizedText(item.text)) throw new Error("Invalid localized release item");
  if (item.issue !== undefined && (!Number.isInteger(item.issue) || Number(item.issue) <= 0))
    throw new Error("Invalid release issue");
}

function compareVersions(previous: unknown, current: string): number {
  if (
    typeof previous !== "object" ||
    previous === null ||
    typeof (previous as Record<string, unknown>).version !== "string"
  )
    throw new Error("Invalid previous release version");
  const previousVersion = (previous as { version: string }).version;
  const parts = (version: string): [number, number, number] => {
    const [major = 0, minor = 0, patch = 0] = version.replace("-beta", "").split(".").map(Number);
    return [major, minor, patch];
  };
  const left = parts(previousVersion);
  const right = parts(current);
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
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
