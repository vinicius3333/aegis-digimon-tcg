import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const releases = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../apps/web/src/releases/releases.json"), "utf8"),
);
// Defaults to the newest release; `render-notes.mjs 1.4.0-beta` (or `v1.4.0-BETA`) renders an older one.
const requested = process.argv.slice(2).find((arg) => arg !== "--");
const release = requested
  ? releases.find(({ version }) => version === requested.replace(/^v/, "").toLowerCase())
  : releases[0];
if (!release) {
  console.error(`[release] Unknown release: ${requested}`);
  process.exit(1);
}
const messages = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../apps/web/src/releases/messages.json"), "utf8"),
);
const repository = "https://github.com/vinicius3333/aegis-digimon-tcg";
const section = (title, items) => [
  `## ${title}`,
  "",
  ...(items.length
    ? items.map(
        (item) =>
          `- ${messages[item.textKey].en}${item.issue ? ` ([reported in-game #${item.issue}](${repository}/issues/${item.issue}))` : ""}`,
      )
    : ["- No entries."]),
  "",
];
console.log(
  [
    `# v${release.version.replace(/-beta$/, "-BETA")}`,
    "",
    messages[release.summaryKey].en,
    "",
    ...section("What's new", release.features),
    ...section("Improvements and fixes", release.fixes),
  ].join("\n"),
);
