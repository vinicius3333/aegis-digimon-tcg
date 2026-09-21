import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const [release] = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../apps/web/src/releases/releases.json"), "utf8"),
);
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
