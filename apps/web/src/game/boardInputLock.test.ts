import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/* The board's answer to a security check in progress: while the scene owns the screen,
   the play surfaces stop taking input, so neither player sends an action into a window
   the other one is still watching resolve (docs/battle-animation-spec.md §4b).

   The lock is wired through GameScreen, which needs a live room to render, so it is
   pinned against the source the way the mobile layout is. `BoardInputLock` itself is
   rendered and asserted in securityFeedback.test.tsx. */
const gameScreenSource = readFileSync(new URL("./GameScreen.tsx", import.meta.url), "utf8");
const gameCss = readFileSync(new URL("./game.css", import.meta.url), "utf8");

describe("board input lock", () => {
  it("takes the whole surface it is dropped into, and takes the pointer with it", () => {
    expect(gameCss).toMatch(/\.game-input-lock \{[^}]*position: absolute;[^}]*inset: 0;/);
    // No `pointer-events: none`: taking the pointer is the entire point of it.
    expect(gameCss).not.toMatch(/\.game-input-lock \{[^}]*pointer-events: none/);
  });

  it("stands for as long as the check owns the screen", () => {
    expect(gameScreenSource).toMatch(/const boardLocked = securityRevealPending && !state\.gameOver;/);
    // Over the field and over the dock; never over the header, the log or surrender.
    expect(gameScreenSource.match(/\{boardLocked \? <BoardInputLock \/> : null\}/g)).toHaveLength(2);
  });

  it("refuses every action the board can send while it stands", () => {
    for (const sender of ["playCard", "digivolve", "attack", "activateEffect", "onBreeding"]) {
      const body = gameScreenSource.slice(gameScreenSource.indexOf(`  const ${sender} = `));
      expect(body.slice(0, body.indexOf("\n  };")), `${sender} is unguarded`).toContain("if (boardLocked) return;");
    }
    expect(gameScreenSource).toMatch(/onEndPhase=\{\(\) => !boardLocked && room && intents\.endPhase\(room\)\}/);
  });
});
