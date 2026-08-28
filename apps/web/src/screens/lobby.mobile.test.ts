import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lobbyCss = readFileSync(new URL("./lobby.css", import.meta.url), "utf8");
const deckCardCss = readFileSync(new URL("./deckListCard.css", import.meta.url), "utf8");
const phoneDeckCardRules = deckCardCss.match(/@media \(width < 600px\) \{(?<rules>[\s\S]*)\n\}/)?.groups?.rules;
const narrowRules = lobbyCss.match(/@media \(width < 960px\) \{(?<rules>[\s\S]*?)\n\}\n\n@media \(width < 600px\)/)
  ?.groups?.rules;

describe("lobby single-column layout", () => {
  it("keeps the deck picker inside the viewport", () => {
    // Grid tracks size to content (a deck thumbnail's 430px source image once
    // stretched the column past the phone viewport), and a definite-height grid
    // scroller drops padding/margins from its scrollable overflow, hiding the
    // sidebar's bottom under the fixed launch bar + nav. Block flow avoids both.
    expect(narrowRules).toBeDefined();
    expect(narrowRules).toMatch(/\.lobby-page \{[^}]*display:\s*block\s*!important/);
    expect(narrowRules).not.toMatch(/\.lobby-page \{[^}]*grid-template-columns/);
    expect(narrowRules).toMatch(
      /\.lobby-page \{[^}]*padding-bottom:\s*calc\(var\(--ds-nav-height-narrow\) \+ var\(--ds-launch-bar-height\)/,
    );
    expect(narrowRules).toMatch(/\.lobby-content,\s*\.lobby-summary \{\s*min-width:\s*0/);
  });

  it("wraps the deck card actions instead of clipping the second one", () => {
    // `.deck-list-card` hides its overflow, so a row that cannot fit both actions
    // cuts "Make active" off at the card edge rather than scrolling it into view.
    expect(phoneDeckCardRules).toBeDefined();
    expect(phoneDeckCardRules).toMatch(/\.deck-list-card__actions \{[^}]*flex-wrap:\s*wrap/);
  });
});
