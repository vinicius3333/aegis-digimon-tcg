import { describe, expect, it } from "vitest";
import { mediaRules, readRelative } from "@/game/style/stylesheetSource";

const desktopRules = mediaRules(readRelative("desktopSidelines.css"), "(min-width: 1280px) and (min-height: 760px)");
const phoneRules = mediaRules(readRelative("fieldLayout.css"), "(width < 600px) and (orientation: portrait)");
const hintSelector = ".aegis-arena .game-player-dock > .game-breeding-dock > .game-breeding-hint";

function ruleBody({ source, selector }: { source: string; selector: string }): string {
  const start = source.indexOf(`${selector} {`);
  return start < 0 ? "" : source.slice(start + selector.length, source.indexOf("}", start));
}

describe("sealed breeding guidance layout owners", () => {
  it("anchors the action-bearing desktop panel to the existing dock bottom", () => {
    const rule = ruleBody({ source: desktopRules, selector: `${hintSelector}:has(> .sealed-breeding-actions)` });
    expect(rule).toMatch(/top:\s*auto;/);
    expect(rule).toMatch(/bottom:\s*1rem;/);
  });

  it("preserves the text-only desktop anchor and width", () => {
    const rule = ruleBody({ source: desktopRules, selector: hintSelector });
    expect(rule).toMatch(/top:\s*1rem;/);
    expect(rule).toMatch(/bottom:\s*auto;/);
    expect(rule).toMatch(/left:\s*calc\(100% - 1rem\);/);
    expect(rule).toMatch(/width:\s*13rem;/);
  });

  it("keeps organized phone viewer labels inside their utility row while sealed actions exist", () => {
    const start = phoneRules.indexOf(
      '.game-board[data-organized-field]:not([data-board-style="arena3d"]):has(.sealed-breeding-actions)',
    );
    expect(start).toBeGreaterThan(-1);
    const rule = phoneRules.slice(start, phoneRules.indexOf("}", start));
    expect(rule).toContain('[class*="game-utility-slot--you-"] .game-pile + span');
    expect(rule).toContain('[class*="game-utility-slot--you-"] .game-breeding-slot > span');
    expect(rule).toContain(".game-security-shield--you .game-security-shield__label");
    expect(rule).toMatch(/\{\s*top:\s*0;\s*$/);
  });

  it("retains ordinary phone labels on the original strip border", () => {
    expect(phoneRules).toMatch(
      /\.game-security-shield--you \.game-security-shield__label\s*\) \{\s*top:\s*-5px;\s*bottom:\s*auto/,
    );
  });
});
