import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const arenaMobileCss = readFileSync(new URL("./arenaMobile.css", import.meta.url), "utf8");

/** The portrait block that lays out the whole phone board. */
const portraitRules = arenaMobileCss.match(
  /@media \(max-width: 1023px\) and \(orientation: portrait\) \{(?<rules>[\s\S]*?)\n\}\n/,
)?.groups?.rules;

describe("portrait player dock", () => {
  it("reserves a band for the counter strip that the hand cannot grow into", () => {
    expect(portraitRules).toBeDefined();
    expect(portraitRules).toMatch(/\.game-board \{[^}]*--arena-hand-reserved:\s*\d+px/);
    expect(portraitRules).toMatch(/\.game-board \.game-player-dock \{[^}]*padding:\s*var\(--arena-hand-reserved\)/);
    // The hand card is capped by the height the reserve leaves, so a short
    // viewport shrinks the card instead of pushing it over the counters.
    expect(portraitRules).toMatch(
      /--arena-hand-card-height:\s*min\(\s*calc\(var\(--arena-hand-width\) \* 1\.4\),\s*calc\(var\(--arena-hand-height\) - var\(--arena-hand-reserved\)\)\s*\)/,
    );
    expect(portraitRules).toMatch(
      /\[data-testid="hand"\] > \.game-hand-card > div \{[^}]*height:\s*var\(--arena-hand-card-height\)/,
    );
  });

  it("keeps the bottom inset out of the row the hand has to fit in", () => {
    // The dock pads itself by the inset; without it in the row the gesture bar
    // ate the card's own height.
    expect(portraitRules).toMatch(
      /grid-template-rows:[\s\S]*?calc\(var\(--arena-hand-height\) \+ env\(safe-area-inset-bottom, 0px\)\)/,
    );
  });

  it("drops the global 44px touch floor from the counter chips", () => {
    // `button { min-height: var(--ds-touch-target) }` stretched a 24px chip to
    // 44px, so its count badge landed on top of the hand cards.
    expect(portraitRules).toMatch(
      /\.game-player-dock > \.game-arena-counters\[data-side="you"\] \.game-arena-counter \{[^}]*min-height:\s*0/,
    );
    expect(portraitRules).toMatch(
      /\.game-player-dock > \.game-arena-counters\[data-side="you"\] \.game-arena-counter::after \{[^}]*width:\s*44px;\s*height:\s*44px/,
    );
    expect(portraitRules).toMatch(
      /\.game-board \.game-player-dock > \.game-arena-counters\[data-side="you"\] \{[^}]*z-index:\s*4/,
    );
  });
});

describe("portrait security shield", () => {
  it("stacks the card row, the count and the label without overlap", () => {
    const shieldHeight = portraitRules?.match(
      /\.game-board \.game-security-shield,\s*\.game-board \.game-security-shield-wrap \{[^}]*height:\s*(?<height>\d+)px/,
    )?.groups?.height;
    const countTop = portraitRules?.match(/\.game-board \.game-security-shield__count \{[^}]*top:\s*(?<top>\d+)px/)
      ?.groups?.top;
    expect(shieldHeight).toBeDefined();
    expect(countTop).toBeDefined();
    // count badge = 14px line + 2px padding + 1px border on each side.
    expect(Number(shieldHeight)).toBeGreaterThanOrEqual(Number(countTop) + 20 + 10);
    expect(portraitRules).toMatch(/\.game-board \.game-security-shield__label \{[^}]*bottom:\s*0/);
  });

  it("centers the count inside its border", () => {
    expect(portraitRules).toMatch(
      /\.game-board \.game-security-shield__count \{[^}]*min-width:\s*24px[^}]*text-align:\s*center/,
    );
  });
});
