import { readFileSync } from "node:fs";

/**
 * The match stylesheet as one string, for the tests that assert against its text.
 * `game.css` is a manifest of `@import`s, so the source those tests need is the
 * parts concatenated in the order the manifest lists them — which is also the
 * cascade order the browser sees.
 */
export function readGameCss(): string {
  const manifest = readFileSync(new URL("../game.css", import.meta.url), "utf8");
  const parts = [...manifest.matchAll(/@import "\.\/style\/([^"]+)";/g)].map((match) => match[1]);
  return parts.map((part) => readFileSync(new URL(`./${part}`, import.meta.url), "utf8")).join("\n");
}
