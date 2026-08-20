import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gameCss = readFileSync(new URL("./game.css", import.meta.url), "utf8");
const overlaysSource = readFileSync(new URL("./overlays.tsx", import.meta.url), "utf8");
const portraitRules = gameCss.match(
  /@media \(width < 600px\) \{(?<rules>[\s\S]*?)\n\}\n\n@media \(width < 600px\) and \(height < 650px\)/,
)?.groups?.rules;

// Where the sidebar stops being a column and becomes a strip along the bottom.
const stripRules = gameCss.match(/@media \(width < 960px\) \{(?<rules>[\s\S]*?)\n\}\n\n@media/)?.groups?.rules;

describe("mobile portrait match layout", () => {
  it("keeps the match inside the viewport and limits scrolling to cards", () => {
    expect(portraitRules).toBeDefined();
    expect(portraitRules).toMatch(/\.game-layout \{[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(/\.game-board \{[^}]*min-height:\s*0/);
    expect(portraitRules).toMatch(/\.game-field \{[^}]*min-height:\s*0[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(/\.game-battle-zones \{[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(/\.game-battle-zones > div:last-child \{[^}]*overflow-x:\s*auto[^}]*scroll-snap-type/);
    expect(portraitRules).toMatch(/\[data-testid="hand"\] \{[^}]*overflow-x:\s*auto[^}]*scroll-snap-type/);
    expect(portraitRules).toMatch(/\.game-sidebar \{[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(/\.game-action-bar--contextual \{[^}]*position:\s*fixed[^}]*flex-wrap:\s*wrap[^}]*overflow:\s*auto/);
    expect(portraitRules).not.toMatch(/\.game-field \{[^}]*height:\s*660px/);
    expect(portraitRules).not.toMatch(/min-height:\s*250px/);
  });

  it("stacks the board into rows instead of sizing regions by hand", () => {
    // The board, the field and the player dock are each a grid whose rows/columns
    // absorb the viewport, so no region needs a hardcoded pixel height.
    expect(portraitRules).toMatch(/\.game-board \{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
    expect(portraitRules).toMatch(/\.game-field \{[^}]*grid-template-columns:[^}]*minmax\(0, 1fr\)/);
    expect(portraitRules).toMatch(/\.game-player-dock \{[^}]*grid-template-rows:\s*auto auto[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(/\.game-battle-zones \{[^}]*grid-template-rows:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
  });

  it("hides the sidebar panels that do not belong on a phone", () => {
    // The log, the memory readout and the phase list are all reachable elsewhere on
    // mobile; only the action buttons (2nd child) survive.
    expect(portraitRules).toMatch(
      /\.game-sidebar > div:first-child,\s*\.game-sidebar > div:nth-child\(3\),\s*\.game-sidebar > div:last-child \{\s*display:\s*none/,
    );
    // The idle bar only repeats the viewer's own name and hand count.
    expect(portraitRules).toMatch(/\.game-action-bar--idle \{\s*display:\s*none/);
  });

  it("sizes board pieces for real instead of scaling them with transforms", () => {
    // A `transform: scale()` shrinks what is painted but not the layout box, so the
    // piles and permanents used to overflow their rails and get clipped. Compact
    // sizes now come from the `compact` prop in boardPieces.tsx.
    expect(portraitRules).not.toMatch(/transform:\s*scale\(/);
    // The full memory gauge is ~950px wide; the compact one must flex to the column.
    expect(portraitRules).not.toMatch(/\.game-memory-gauge \{[^}]*width:\s*max-content/);
  });

  it("lets a sideways swipe scroll the hand instead of dragging a card", () => {
    // `touch-action: none` on the cards left the browser unable to pan the row they
    // sit in, so the hand could not be scrolled. `pan-x` hands sideways swipes to
    // the scroller and leaves steeper drags (play / attack) to the pointer handlers.
    expect(portraitRules).not.toMatch(/touch-action:\s*none/);
    expect(portraitRules).toMatch(/\[data-testid="hand"\] > div \{[^}]*touch-action:\s*pan-x/);
    expect(portraitRules).toMatch(/\.game-battle-zones > div:last-child > div \{[^}]*touch-action:\s*pan-x/);
  });

  it("gives field cards and hand cards a touch sheet", () => {
    // Hand cards and field cards share one sheet, so a tapped card reads the same
    // wherever it lives. Nothing may resurrect the old centred preview.
    expect(portraitRules).not.toMatch(/hand-card-preview/);
    expect(portraitRules).toMatch(/\.card-action-sheet \{[^}]*position:\s*fixed[^}]*align-items:\s*end/);
    expect(portraitRules).toMatch(/\.card-action-sheet__actions > button \{[^}]*min-height:\s*44px/);
  });

  it("turns every centred match dialog into a bottom sheet", () => {
    expect(portraitRules).toMatch(
      /\.game-modal,[\s\S]*?\.aegis-dialog-layer:has\(\.game-modal__panel\) \{[^}]*position:\s*fixed[^}]*align-items:\s*flex-end/,
    );
    expect(portraitRules).toMatch(/\.game-modal__panel \{[^}]*width:\s*100%[^}]*max-width:\s*none/);
    // A bare panel brings no scrim, so it pins itself to the viewport bottom.
    expect(portraitRules).toMatch(/\.game-modal__panel--bare \{[^}]*position:\s*fixed[^}]*bottom:\s*0/);
    // Flex rows default to min-width:auto, which is what pushed the confirm
    // dialog past the right edge instead of wrapping its text.
    expect(portraitRules).toMatch(/\.game-modal__panel > div \{\s*min-width:\s*0/);
  });

  it("keeps the pending-decision return control below the mobile opponent bar", () => {
    expect(gameCss).toMatch(
      /\.decision-board-return \{[^}]*position:\s*fixed[^}]*z-index:\s*calc\(var\(--ds-z-toast\) - 1\)[^}]*env\(safe-area-inset-top/,
    );
    // A bottom control can sit underneath iOS browser chrome. The document-body
    // portal is anchored below the opponent row and explicitly clears bottom.
    expect(portraitRules).toMatch(/\.decision-board-return \{[^}]*top:\s*calc\(env\(safe-area-inset-top,[^}]*bottom:\s*auto/);
    expect(portraitRules).toMatch(/\.decision-board-return > button \{[^}]*min-height:\s*44px/);
  });
});

describe("match overlays opt into the mobile sheet", () => {
  // Every dialog-style overlay on the match screen must carry the shared classes,
  // otherwise it keeps its desktop centring on a phone and overflows the viewport.
  const OVERLAYS = [
    "BreedingOverlay",
    "GameOverOverlay",
    "StackViewerOverlay",
    "TrashViewerOverlay",
    "DigiXrosMaterialOverlay",
    "ActionConfirmationOverlay",
    "DecisionOverlay",
  ];

  it.each(OVERLAYS)("%s tags a panel", (name) => {
    const start = overlaysSource.indexOf(`export function ${name}(`);
    expect(start).toBeGreaterThan(-1);
    const next = overlaysSource.indexOf("\nexport function ", start + 1);
    const body = overlaysSource.slice(start, next === -1 ? undefined : next);
    expect(body).toContain("game-modal__panel");
  });
});

describe("the sidebar strip", () => {
  it("lays the footer buttons side by side", () => {
    // Stacked, the report and the surrender buttons are taller than the strip itself.
    expect(stripRules).toBeDefined();
    expect(stripRules).toMatch(/\.game-sidebar__footer \{[^}]*flex-direction:\s*row/);
  });
});
