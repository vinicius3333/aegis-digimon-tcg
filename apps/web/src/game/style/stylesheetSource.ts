import { readFileSync } from "node:fs";

/**
 * One of the match stylesheets as a single string, for the tests that assert
 * against its text. `game.css`, `arena.css` and `arenaMobile.css` are manifests
 * of `@import`s, so the source those tests need is the parts concatenated in the
 * order the manifest lists them — which is also the cascade order the browser
 * sees.
 */
export function readStylesheet(manifest: string): string {
  const source = readFileSync(new URL(`../${manifest}`, import.meta.url), "utf8");
  const parts = [...source.matchAll(/@import "\.\/style\/([^"]+)";/g)].map((match) => match[1]);
  return parts.map((part) => readFileSync(new URL(`./${part}`, import.meta.url), "utf8")).join("\n");
}

/**
 * Every rule inside the media blocks whose condition matches, in source order.
 * A stylesheet is split across files, so one condition can open more than one
 * block; matching the header and then balancing braces keeps those halves
 * together and does not depend on what sits between two blocks.
 */
export function mediaRules(css: string, condition: string): string {
  const header = `@media ${condition} {`;
  const bodies: string[] = [];
  for (let start = css.indexOf(header); start > -1; start = css.indexOf(header, start + 1)) {
    let depth = 0;
    let index = start + header.length - 1;
    for (; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1;
      if (css[index] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    bodies.push(css.slice(start + header.length, index));
  }
  return bodies.join("\n");
}
