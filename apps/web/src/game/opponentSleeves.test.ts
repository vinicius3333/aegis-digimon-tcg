import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gameScreenSource = readFileSync(new URL("./GameScreen.tsx", import.meta.url), "utf8");

describe("opponent hidden-card backs", () => {
  it("does not apply the local sleeve to opponent-owned piles", () => {
    // Each opponent pile is matched from its own `count` prop up to the closing
    // tag, so a decorative prop added between them cannot make the assertion pass
    // by accident — nor break it for being in the wrong place.
    // The piles are drawn from the presented board (`shownOpp`, and `breedingOpp` for the
    // raising area's own clock), not the live state.
    expect(gameScreenSource).toMatch(/count=\{shownOpp\.deckCount\}(?:(?!\/>)[\s\S])*?useSelectedSleeve=\{false\}/);
    expect(gameScreenSource).toMatch(/count=\{shownOpp\.trash\.length\}(?:(?!\/>)[\s\S])*?useSelectedSleeve=\{false\}/);
    expect(gameScreenSource).toMatch(
      /count=\{breedingOpp\.eggDeckCount\}(?:(?!\/>)[\s\S])*?egg(?:(?!\/>)[\s\S])*?useSelectedSleeve=\{false\}/,
    );
    // The security shield's count goes through `shieldSecurityCount`, which holds the
    // figure while a scene is still showing a card leaving, so it is matched by its own
    // `shield={Side.Opponent}` marker instead.
    expect(gameScreenSource).toMatch(/shield=\{Side\.Opponent\}[\s\S]*?useSelectedSleeve=\{false\}/);
  });
});
