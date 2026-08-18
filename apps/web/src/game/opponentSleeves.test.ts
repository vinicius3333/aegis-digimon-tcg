import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gameScreenSource = readFileSync(new URL("./GameScreen.tsx", import.meta.url), "utf8");

describe("opponent hidden-card backs", () => {
  it("does not apply the local sleeve to opponent-owned piles", () => {
    expect(gameScreenSource).toMatch(
      /<Pile\s+compact=\{compactPiles\}\s+count=\{opp\.deckCount\}\s+label=\{t\("game\.pile\.deck"\)\}\s+useSelectedSleeve=\{false\}\s+\/>/,
    );
    expect(gameScreenSource).toMatch(
      /<Pile\s+compact=\{compactPiles\}\s+count=\{opp\.trash\.length\}\s+label=\{t\("game\.pile\.trash"\)\}\s+topCardId=\{opp\.trash\[opp\.trash\.length - 1\]\?\.cardId\}\s+onClick=\{opp\.trash\.length \? \(\) => setTrashView\("opp"\) : undefined\}\s+useSelectedSleeve=\{false\}\s+\/>/,
    );
    expect(gameScreenSource).toMatch(/count=\{opp\.securityCount\}[\s\S]*?useSelectedSleeve=\{false\}/);
  });
});
