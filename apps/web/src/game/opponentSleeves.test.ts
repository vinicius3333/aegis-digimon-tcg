import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gameScreenSource = readFileSync(new URL("./GameScreen.tsx", import.meta.url), "utf8");

describe("opponent hidden-card backs", () => {
  it("does not apply the local sleeve to opponent-owned piles", () => {
    // Each opponent pile is matched from its own `count` prop up to the closing
    // tag, so a decorative prop added between them cannot make the assertion pass
    // by accident — nor break it for being in the wrong place.
    expect(gameScreenSource).toMatch(/count=\{opp\.deckCount\}(?:(?!\/>)[\s\S])*?useSelectedSleeve=\{false\}/);
    expect(gameScreenSource).toMatch(/count=\{opp\.trash\.length\}(?:(?!\/>)[\s\S])*?useSelectedSleeve=\{false\}/);
    // The security shield's count goes through `shieldSecurityCount`, which holds the
    // figure while a scene is still showing a card leaving, so it is matched by its own
    // `shield="opp"` marker instead.
    expect(gameScreenSource).toMatch(/shield="opp"[\s\S]*?useSelectedSleeve=\{false\}/);
  });
});
