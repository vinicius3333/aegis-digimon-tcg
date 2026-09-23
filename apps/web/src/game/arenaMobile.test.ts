import { describe, expect, it } from "vitest";
import { mediaRules, readStylesheet } from "./style/stylesheetSource";

const arenaMobileCss = readStylesheet("arenaMobile.css");

/** The portrait block that lays out the whole phone board. */
const portraitRules = mediaRules(arenaMobileCss, "(max-width: 1023px) and (orientation: portrait)");

describe("portrait player dock", () => {
  it("reserves a band for the counter strip that the hand cannot grow into", () => {
    expect(portraitRules).toBeDefined();
    expect(portraitRules).toMatch(/\.game-board \{[^}]*--arena-hand-reserved:\s*\d+px/);
    expect(portraitRules).toMatch(/\.game-board \.game-player-dock \{[^}]*padding:\s*var\(--arena-hand-reserved\)/);
    // The hand card is capped by the height the reserve and the lift headroom
    // leave, so a short viewport shrinks the card instead of pushing it over the
    // counters or past the row's clipped top edge.
    expect(portraitRules).toMatch(
      /--arena-hand-card-height:\s*min\(\s*calc\(var\(--arena-hand-width\) \* 1\.4\),\s*calc\(\s*var\(--arena-hand-height\) - var\(--arena-hand-reserved\) - var\(--arena-hand-lift\) -\s*var\(--arena-hand-row-chrome\)\s*\)\s*\)/,
    );
    expect(portraitRules).toMatch(/\[data-testid="hand"\] \{[^}]*padding:\s*var\(--arena-hand-lift\)/);
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

describe("portrait memory marker", () => {
  it("drops the yellow marker for a red one once memory sits on the opponent's side", () => {
    const opponentMarker = portraitRules?.match(
      /\.game-board \.game-memory-coin--marker\[data-memory-side="opp"\]::before \{(?<rule>[^}]*)\}/,
    )?.groups?.rule;
    expect(opponentMarker).toBeDefined();
    expect(opponentMarker).not.toMatch(/#ffe980/);
    expect(opponentMarker).toMatch(/border-color:\s*#ff9a6e/);
    expect(portraitRules).toMatch(
      /\.game-board \.game-memory-coin--marker\[data-memory-side="opp"\] \.game-memory-coin__n \{[^}]*color:\s*#ffe0d0/,
    );
  });
});

describe("portrait turn orb", () => {
  it("holds its longest label inside the circle", () => {
    // "Opponent's" and "oponente" are single words ~40px wide at this size: the
    // orb grows to 48px and drops its padding so neither spills past the circle.
    expect(portraitRules).toMatch(
      /\.game-board \.game-end-turn-orb \{[^}]*width:\s*48px;\s*height:\s*48px;[^}]*padding:\s*0;[^}]*font:\s*700 7\.5px\/1\.1 [^}]*letter-spacing:\s*-0\.02em/,
    );
  });
});
