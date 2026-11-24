import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("gives the three lobby modes three equal desktop tracks", () => {
  const css = readFileSync(new URL("./lobby.css", import.meta.url), "utf8");
  expect(css.match(/\.lobby-modes\s*\{([^}]+)\}/)?.[1]).toMatch(
    /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  );
});
