const CHANGE_TYPES = ["added", "changed", "fixed", "removed"];

export const CONVENTIONAL_COMMIT = /^(?<type>build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<subject>.+)$/u;

export function parseConventionalCommit(subject, body = "") {
  const match = CONVENTIONAL_COMMIT.exec(subject.trim());
  if (!match?.groups) return undefined;

  return {
    type: match.groups.type,
    subject: match.groups.subject,
    breaking: match.groups.breaking === "!" || /(^|\n)BREAKING[ -]CHANGE:/u.test(body),
  };
}

export function requiredBump(commits) {
  if (commits.some((commit) => commit.breaking)) return "major";
  if (commits.some((commit) => commit.type === "feat")) return "minor";
  if (commits.some((commit) => commit.type === "fix" || commit.type === "perf")) return "patch";
  return undefined;
}

export function bumpVersion(version, bump) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version);
  if (!match) throw new Error(`Invalid semantic version: ${version}`);
  const [, majorText, minorText, patchText] = match;
  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown release bump: ${bump}`);
}

export function changeForCommit(commit) {
  if (commit.breaking) return { type: "changed", description: `Breaking: ${commit.subject}` };
  if (commit.type === "feat") return { type: "added", description: commit.subject };
  if (commit.type === "fix" || commit.type === "perf") return { type: "fixed", description: commit.subject };
  if (commit.type === "refactor") return { type: "changed", description: commit.subject };
  if (commit.type === "revert") return { type: "removed", description: commit.subject };
  return undefined;
}

export function cardChangesForPaths(paths) {
  const cardIds = new Set();
  const cardPath = /^apps\/api\/src\/cards\/[^/]+\/([A-Z0-9]+-\d+)(?:\.test)?\.ts$/u;

  for (const path of paths) {
    const match = cardPath.exec(path.trim());
    if (match) cardIds.add(match[1]);
  }

  return [...cardIds]
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
    .map((cardId) => ({ type: "fixed", description: cardId }));
}

export function renderChangelog(releases) {
  const output = [
    "# Changelog",
    "",
    "All notable changes to Aegis are documented here. This file is generated from",
    "`releases.json`; use `pnpm release:prepare` to add a release.",
  ];

  for (const release of releases) {
    output.push("", `## [${release.version}] - ${release.date}`);
    for (const type of CHANGE_TYPES) {
      const changes = release.changes.filter((change) => change.type === type);
      if (!changes.length) continue;
      output.push("", `### ${type[0].toUpperCase()}${type.slice(1)}`, "", ...changes.map((change) => `- ${change.description}`));
    }
  }

  return `${output.join("\n")}\n`;
}

export function renderWebReleaseData(version, releases) {
  const notes = releases.map((release) => `  {\n    version: ${JSON.stringify(release.version)},\n    date: ${JSON.stringify(release.date)},\n    changes: [\n${release.changes.map((change) => `      { type: ${JSON.stringify(change.type)}, description: ${JSON.stringify(change.description)}${change.translations ? `, translations: ${JSON.stringify(change.translations)}` : ""} },`).join("\n")}\n    ],\n  },`).join("\n");
  return `/* This file is generated from releases.json. */\n\nexport const APP_VERSION = ${JSON.stringify(version)};\n\nexport interface ReleaseNote {\n  version: string;\n  date: string;\n  changes: Array<{\n    type: "added" | "changed" | "fixed" | "removed";\n    description: string;\n    translations?: Record<string, string>;\n  }>;\n}\n\nexport const RELEASE_NOTES: ReleaseNote[] = [\n${notes}\n];\n`;
}
