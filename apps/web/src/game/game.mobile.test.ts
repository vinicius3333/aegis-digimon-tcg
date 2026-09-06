import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gameCss = readFileSync(new URL("./game.css", import.meta.url), "utf8");
const overlaysSource = readFileSync(new URL("./overlays.tsx", import.meta.url), "utf8");
const gameScreenSource = readFileSync(new URL("./GameScreen.tsx", import.meta.url), "utf8");
const boardPiecesSource = readFileSync(new URL("./boardPieces.tsx", import.meta.url), "utf8");
// The phone block's condition is a list — narrow, or short and on its side — so
// the header is matched loosely up to its brace.
const portraitRules = gameCss.match(
  /@media \(width < 600px\)[^{]*\{(?<rules>[\s\S]*?)\n\}\n\n@media \(width < 600px\) and \(height < 650px\)/,
)?.groups?.rules;
/** The landscape-phone block, which re-lays the board for a short viewport. */
const landscapeRules = gameCss.match(
  /@media \(height < 520px\) and \(orientation: landscape\) \{(?<rules>[\s\S]*?)\n\}\n/,
)?.groups?.rules;

// Where the sidebar stops being a column and becomes a strip along the bottom.
const stripRules = gameCss.match(/@media \(width < 960px\) \{(?<rules>[\s\S]*?)\n\}\n\n@media/)?.groups?.rules;

/** Phone portrait only: the floating stacks and the board-mode sheet. */
const phonePortraitRules = gameCss.match(
  /@media \(width < 600px\) and \(orientation: portrait\) \{(?<rules>[\s\S]*?)\n\}\n/,
)?.groups?.rules;
/** Narrow width at any orientation — a landscape phone is ~844px wide, so it is not this. */
const narrowWidthRules = gameCss.match(/@media \(width < 600px\) \{(?<rules>[\s\S]*?)\n\}\n/)?.groups?.rules;
/** Pointer widths, which keep the full-size fanned hand. */
const pointerWidthRules = gameCss.match(/@media \(width >= 960px\) \{(?<rules>[\s\S]*?)\n\}\n/)?.groups?.rules;

describe("mobile portrait match layout", () => {
  it("keeps the match inside the viewport and limits scrolling to cards", () => {
    expect(portraitRules).toBeDefined();
    expect(portraitRules).toMatch(/\.game-layout \{[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(/\.game-board \{[^}]*min-height:\s*0/);
    expect(portraitRules).toMatch(/\.game-field \{[^}]*min-height:\s*0[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(/\.game-battle-zones \{[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(
      /\.game-battle-zones > div:last-child \{[^}]*overflow-x:\s*auto[^}]*scroll-snap-type/,
    );
    expect(portraitRules).toMatch(/\[data-testid="hand"\] \{[^}]*overflow-x:\s*auto[^}]*scroll-snap-type/);
    expect(portraitRules).toMatch(/\.game-sidebar \{[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(
      /\.game-action-bar--contextual \{[^}]*position:\s*fixed[^}]*flex-wrap:\s*wrap[^}]*overflow:\s*auto/,
    );
    expect(portraitRules).not.toMatch(/\.game-field \{[^}]*height:\s*660px/);
    expect(portraitRules).not.toMatch(/min-height:\s*250px/);
  });

  it("stacks the board into rows instead of sizing regions by hand", () => {
    // The board, the field and the player dock are each a grid whose rows/columns
    // absorb the viewport, so no region needs a hardcoded pixel height.
    expect(portraitRules).toMatch(/\.game-board \{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
    expect(portraitRules).toMatch(/\.game-field \{[^}]*grid-template-columns:[^}]*minmax\(0, 1fr\)/);
    expect(portraitRules).toMatch(/\.game-player-dock \{[^}]*grid-template-rows:\s*auto auto[^}]*overflow:\s*hidden/);
    expect(portraitRules).toMatch(
      /\.game-battle-zones \{[^}]*grid-template-rows:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\)/,
    );
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

  it("lays the hand out as whole cards a finger can hit", () => {
    // The row scrolls, so burying a card under its neighbour bought no room and
    // left the overlapped edge selecting the wrong card.
    expect(portraitRules).not.toMatch(/\[data-testid="hand"\] > div \{[^}]*margin-left:\s*-/);
    expect(portraitRules).toMatch(/\[data-testid="hand"\] > div \{[^}]*margin-left:\s*var\(--ds-space-1\)/);
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

  it("declares the board metrics where the portalled overlays can read them", () => {
    // The rail and the other match overlays portal into #aegis-stage, a sibling of
    // the layout: a metric scoped to .game-layout is undefined there, and the
    // rail's `bottom: calc(var(--game-hand-h) …)` fell back to `auto` — the stage
    // clipped away the pending decision's only exit.
    expect(portraitRules).toMatch(/:root \{[^}]*--game-hand-h:\s*calc\(var\(--hand-card-width\)/);
    expect(phonePortraitRules).toMatch(/:root \{[^}]*--game-rail:\s*4rem/);
    expect(gameCss).not.toMatch(/\.game-layout \{[^}]*--game-(rail|hand-h|sidebar-h)/);
    expect(gameCss).not.toMatch(/\.game-layout \{[^}]*--hand-card-width/);
  });

  it("keeps the contextual action bar under the whole dialog tier", () => {
    // On the toast tier the bar held its band at the bottom of the screen while a
    // bottom sheet was open there, and painted over the sheet's own action row.
    expect(portraitRules).toMatch(/\.game-action-bar--contextual \{[^}]*z-index:\s*calc\(var\(--ds-z-dialog\) - 6\)/);
    expect(landscapeRules).toMatch(/\.game-action-bar--contextual \{[^}]*z-index:\s*calc\(var\(--ds-z-dialog\) - 6\)/);
    expect(gameCss).not.toMatch(/\.game-action-bar--contextual \{[^}]*var\(--ds-z-toast\)/);
  });

  it("keeps the pending-decision return control below the mobile opponent bar", () => {
    expect(gameCss).toMatch(
      /\.decision-board-return \{[^}]*position:\s*fixed[^}]*z-index:\s*calc\(var\(--ds-z-toast\) - 1\)[^}]*env\(safe-area-inset-top/,
    );
    // A bottom control can sit underneath iOS browser chrome. The document-body
    // portal is anchored below the opponent row and explicitly clears bottom.
    expect(portraitRules).toMatch(
      /\.decision-board-return \{[^}]*top:\s*calc\(env\(safe-area-inset-top,[^}]*bottom:\s*auto/,
    );
    expect(portraitRules).toMatch(/\.decision-board-return > button \{[^}]*min-height:\s*44px/);
  });

  it("shrinks the board-mode decision rail so the phone board stays readable", () => {
    // The rail is the only way to answer a board-mode decision, so its actions must
    // never be pushed off: it takes a fraction of the width, shows the printed
    // clause whole, and only the rail itself scrolls when it outgrows the screen.
    expect(portraitRules).toMatch(/\.board-prompt \{[^}]*width:\s*min\(15rem, 46vw\)/);
    expect(gameCss).not.toMatch(/\.board-prompt__clause \{[^}]*max-height/);
    expect(gameCss).toMatch(/\.board-prompt \{[^}]*overflow-y:\s*auto/);
    // The opponent pill clears the phone opponent bar instead of painting over it.
    expect(portraitRules).toMatch(/\.board-opponent-pill \{[^}]*top:\s*3\.5rem/);
  });
});

describe("choice rows lead with the affirmative action", () => {
  // The affirmative action leads the DOM, so it also leads the tab order. A row
  // reverses to put it on the right; stacked, DOM order already reads top-down.
  it("reverses horizontal rows so the leading action sits on the right", () => {
    expect(gameCss).toMatch(/\.game-actions-row \{[^}]*flex-direction:\s*row-reverse/);
    expect(gameCss).toMatch(/\.mulligan-actions \{[^}]*flex-direction:\s*row-reverse/);
  });

  it.each([
    ["EvadeOverlay", "overlay.suspendToEvade", "overlay.letDeleted"],
    ["BarrierOverlay", "overlay.trashSecurity", "overlay.letDeleted"],
    ["ActionConfirmationOverlay", "{confirmLabel}", "common.cancel"],
    ["DigiXrosMaterialOverlay", "overlay.xrosConfirm", "common.cancel"],
    ["GameOverOverlay", "overlay.findRematch", "overlay.mainMenu"],
    ["MulliganOverlay", "overlay.keep", "overlay.mulligan"],
  ])("%s lists its confirming action before %s", (name, confirming, trailing) => {
    const start = overlaysSource.indexOf(`export function ${name}(`);
    expect(start).toBeGreaterThan(-1);
    const next = overlaysSource.indexOf("\nexport function ", start + 1);
    const body = overlaysSource.slice(start, next === -1 ? undefined : next);
    expect(body).toMatch(/className="(game-actions-row|mulligan-actions)"/);
    expect(body.indexOf(confirming)).toBeGreaterThan(-1);
    expect(body.indexOf(confirming)).toBeLessThan(body.indexOf(trailing));
  });
});

describe("match overlays opt into the mobile sheet", () => {
  // Every dialog-style overlay on the match screen must carry the shared classes,
  // otherwise it keeps its desktop centring on a phone and overflows the viewport.
  // GameOverOverlay is deliberately absent: it is no longer a dialog on top of
  // the board but the full-screen result splash, which owns the whole viewport
  // and scrolls itself (asserted below) rather than sitting in a sheet.
  const OVERLAYS = [
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

describe("the result splash owns the whole screen", () => {
  // It replaces the board rather than covering it, so on a phone it has to lay
  // its own contents out and scroll them instead of relying on the sheet rules.
  it("fills the viewport and scrolls its own contents", () => {
    const rules = gameCss.slice(gameCss.indexOf(".game-result {"));
    expect(rules).toMatch(/\.game-result \{[^}]*position:\s*absolute/);
    expect(rules).toMatch(/\.game-result \{[^}]*inset:\s*0/);
    expect(rules).toMatch(/\.game-result \{[^}]*overflow:\s*auto/);
  });

  it("sizes the one big word against the viewport", () => {
    expect(gameCss).toMatch(/\.game-result__title \{[^}]*font-size:\s*clamp\(/);
  });
});

describe("the sidebar strip", () => {
  it("lays the footer buttons side by side", () => {
    // Stacked, the report and the surrender buttons are taller than the strip itself.
    expect(stripRules).toBeDefined();
    expect(stripRules).toMatch(/\.game-sidebar__footer \{[^}]*flex-direction:\s*row/);
  });
});

describe("the phone rules win the cascade", () => {
  // Narrow-viewport blocks share their base rules' specificity, so they only win
  // by coming later in the file. They used to sit in the middle of it, and every
  // base rule written below silently defeated its own phone override — the
  // end-turn orb, for one, kept its 5.4rem desktop diameter on a phone.
  const responsiveStart = gameCss.indexOf("@media (width < 1240px)");

  it("keeps every width-based block after the last base rule", () => {
    expect(responsiveStart).toBeGreaterThan(-1);
    const base = gameCss.slice(0, responsiveStart);
    const afterResponsive = gameCss.slice(responsiveStart);
    // Only media blocks (and the trailing reduced-motion one) may follow.
    expect(afterResponsive.replace(/@media[^{]*\{[\s\S]*/, "")).not.toMatch(/^\s*\.[\w-]+[^{]*\{/m);
    expect(base).toMatch(/\.game-end-turn-orb \{/);
  });

  it("shrinks the end-turn orb on a phone", () => {
    expect(portraitRules).toMatch(/\.game-end-turn-orb \{[^}]*width:\s*3\.4rem/);
  });
});

describe("nothing on the phone board is clipped by its neighbour", () => {
  it("floors the hand dock so the action strip cannot squeeze it", () => {
    expect(portraitRules).toMatch(/\.game-hand-dock \{[^}]*min-height:\s*calc\(var\(--game-hand-h\)/);
    expect(portraitRules).toMatch(/--game-hand-h:\s*calc\(var\(--hand-card-width\)/);
  });

  it("drops the action strip while it holds no action", () => {
    expect(portraitRules).toMatch(
      /\.game-sidebar > div:nth-child\(2\):not\(:has\(button\)\) \{\s*display:\s*none !important/,
    );
  });

  it("sizes the bottom action strip by the button it holds", () => {
    // At 3.25rem the row left a 36px content box for a control the touch rules
    // floor at 44px, and the sidebar's own clip took the missing 8px off the
    // bottom of the breeding step's only action.
    expect(phonePortraitRules).toMatch(
      /\.game-sidebar > div:nth-child\(2\) \{[^}]*height:\s*auto[^}]*min-height:\s*calc\(44px/,
    );
  });

  it("fits the security shields inside their rail", () => {
    // The rail is 3.5rem wide; the desktop shield is 4.1rem and hung off both
    // screen edges with a slice of the chevron cut away.
    expect(portraitRules).toMatch(/\.game-security-shield \{[^}]*width:\s*3rem/);
  });

  it("caps the action sheet's card by height", () => {
    // The card is a button, and the old rule still aimed at a `div`: nothing
    // capped it and the sheet ran off the bottom of the screen.
    expect(portraitRules).toMatch(
      /\.card-action-sheet__body > \.card-action-sheet__zoom \{[^}]*height:\s*min\(30dvh, 12rem\)/,
    );
    expect(portraitRules).not.toMatch(/\.card-action-sheet__body > div:first-child \{/);
  });

  it("spans the reveal panel across the screen", () => {
    expect(portraitRules).toMatch(/\.side-panel-stack,\s*\.match-notice-stack \{[^}]*width:\s*auto/);
  });
});

describe("floating chrome keeps clear of the hand and the memory band", () => {
  // Both stacks span the width on a phone in portrait, so "notices left, panels
  // right" no longer separates them: each anchors to its own screen edge and
  // grows toward the middle, uncapped, showing its content whole.
  it("lets the notice stack and the side panels show whole from their own edges", () => {
    expect(phonePortraitRules).toBeDefined();
    // No cap on either stack or on the notice text: every cap tried here
    // (7rem, then a dvh split) decapitated a notice's clause or a revealed
    // card's art while screen space sat empty next to it. Nothing may
    // reintroduce one.
    expect(phonePortraitRules).not.toMatch(/\.match-notice-stack[^{]*\{[^}]*max-height/);
    expect(phonePortraitRules).not.toMatch(/\.side-panel-stack \{[^}]*max-height/);
    expect(gameCss).not.toMatch(/\.match-notice__text \{[^}]*max-height/);
    expect(phonePortraitRules).toMatch(/\.side-panel-stack\[data-side="opp"\] \{[^}]*top:\s*calc\(17rem/);
    expect(phonePortraitRules).toMatch(/\.side-panel-stack\[data-side="you"\] \{[^}]*bottom:\s*calc\(17rem/);
    // The notices keep the corner they already had.
    expect(gameCss).toMatch(/\.match-notice-stack\[data-anchor\^="bottom-"\] \{[^}]*bottom:\s*calc\(11rem/);
    // …but not the tablet block's 9rem, which landed them on the egg deck and the
    // raising slot. A notice takes the tap meant for either.
    expect(phonePortraitRules).toMatch(/\.match-notice-stack\[data-anchor\^="bottom-"\] \{[^}]*bottom:\s*calc\(17rem/);
  });

  it("drops the opponent's notices and the attack call-out below the phone feed", () => {
    // The feed starts at 6.75rem and is 3.25rem tall in portrait, so the base
    // 9.5rem put both of them underneath it: the player never read who attacked.
    expect(phonePortraitRules).toMatch(/\.match-notice-stack\[data-anchor\^="top-"\] \{[^}]*top:\s*calc\(10\.5rem/);
    expect(phonePortraitRules).toMatch(/\.attack-announcement \{[^}]*top:\s*calc\(10\.5rem/);
  });

  it("gives the phone's collapsed notice band a place of its own", () => {
    // GameScreen folds every anchor into one top-center stack on a portrait
    // phone; the band pins below the opponent feed and spans the width.
    expect(gameScreenSource).toMatch(/const collapseNotices = narrowGameLayout && !landscapePhone;/);
    expect(gameScreenSource).toMatch(/collapse=\{collapseNotices\}/);
    expect(narrowWidthRules).toMatch(/\.match-notice-stack\[data-anchor="top-center"\] \{[^}]*top:\s*calc\(10\.5rem/);
    // The clause is shown whole here too: no clamp may cut it on any layout.
    expect(narrowWidthRules).not.toMatch(/\.match-notice__text \{/);
    expect(gameCss).not.toMatch(/\.match-notice__text \{[^}]*line-clamp/);
  });

  it("gives both dismiss buttons a finger-sized target", () => {
    // Each is the only early way out of a notice or a reveal panel, and the chip
    // itself has to stay small — the target rides behind it instead.
    expect(phonePortraitRules).toMatch(/\.match-notice__close::after \{[^}]*width:\s*44px[^}]*height:\s*44px/);
    expect(phonePortraitRules).toMatch(/\.side-panel__close::after \{[^}]*width:\s*44px[^}]*height:\s*44px/);
    // The notice's chip sits at the top edge of a stack that clips to its band, so
    // its target grows inward from that corner rather than around the chip.
    expect(phonePortraitRules).not.toMatch(/\.match-notice__close::after \{[^}]*translate:/);
  });

  it("clears the full-size fanned hand at pointer widths", () => {
    // The 132px hand fans ~75px taller than the compact one; at 11rem the viewer's
    // panels and notices sat on top of it on a 900px-tall laptop.
    expect(pointerWidthRules).toBeDefined();
    expect(pointerWidthRules).toMatch(/\.side-panel-stack\[data-side="you"\] \{[^}]*bottom:\s*calc\(13rem/);
    expect(pointerWidthRules).toMatch(/\.match-notice-stack\[data-anchor\^="bottom-"\] \{[^}]*bottom:\s*calc\(13rem/);
  });

  it("moves the opponent's notices and the attack call-out off the landscape band", () => {
    // The memory band crosses the middle of a 390px-tall screen, which is where
    // 9.5rem put both of them.
    expect(landscapeRules).toMatch(/\.match-notice-stack\[data-anchor\^="top-"\] \{[^}]*top:\s*calc\(3\.25rem/);
    expect(landscapeRules).toMatch(/\.attack-announcement \{[^}]*top:\s*calc\(3\.25rem[^}]*translate:\s*none/);
  });
});

describe("an animation ends with the thing it is drawn on", () => {
  it("runs the shield's burst on the shatter's clock", () => {
    // The burst is unmounted with the break phase, which is a fraction of the
    // generic card-landing burst: on that clock it was cut a third of the way
    // through and popped away at its brightest. The fallback tracks
    // TIMINGS.shieldBreak, like the shard rule above it.
    expect(gameCss).toMatch(
      /\.game-security-shield__burst \.battle-burst__ring \{\s*animation-duration:\s*var\(--t-shield-break, 250ms\)/,
    );
  });
});

describe("the drag intent label reads the pointer, not the viewport", () => {
  it("asks the pointer media query rather than guessing from the width", () => {
    // A touchscreen laptop is wide, so a width breakpoint would leave the label
    // under the finger on exactly the devices that need it lifted.
    expect(gameScreenSource).toMatch(/COARSE_POINTER_QUERY/);
    expect(gameScreenSource).toMatch(/top:\s*drag!\.y - dragIntentLabelOffsetPx\(coarsePointer\)/);
  });
});

describe("the portrait phone spends its height on the cards, not on empty rows", () => {
  it("hands the recovered height to bigger hand cards", () => {
    // The 21vw card was 83px wide and hard to read; the rows above pay for it.
    expect(phonePortraitRules).toMatch(/--hand-card-width:\s*clamp\(5\.5rem, 25vw, 7rem\)/);
  });

  it("gives the hand dock one row of its own so the cards cannot be cut off", () => {
    // The hand's bottom ~15% sat below the dock, where the board's overflow
    // clipped it and the action strip painted over it.
    expect(phonePortraitRules).toMatch(
      /\.game-hand-dock \{[^}]*grid-template-rows:\s*minmax\(var\(--game-hand-h\), auto\)[^}]*align-content:\s*center/,
    );
    // A classic sideways scrollbar takes its height out of the row's content box,
    // so a row pinned to the card's height clips the card tops by the bar.
    expect(phonePortraitRules).toMatch(
      /\[data-testid="hand"\] \{[^}]*height:\s*auto !important[^}]*min-height:\s*var\(--game-hand-h\)/,
    );
    // The desktop fan's negative margin hangs the row past the dock it sits in.
    expect(phonePortraitRules).toMatch(/\.game-player-dock \[data-testid="hand"\] \{\s*margin:\s*0 !important/);
  });

  it("drops the rotated breeding caption and keeps the band one row", () => {
    expect(phonePortraitRules).toMatch(/\.game-breeding-dock > div:first-child \{\s*display:\s*none/);
    expect(phonePortraitRules).toMatch(/\.game-breeding-dock \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  });
});

describe("nothing on the portrait phone board paints past the screen edge", () => {
  it("widens the rail to hold the pile's depth and the slot beside it", () => {
    // Six depth layers reach ~16px down-right of the pile's own 42px box, and
    // the opponent's raising slot read as cut off against the right edge.
    expect(phonePortraitRules).toMatch(/--game-rail:\s*4rem/);
    expect(phonePortraitRules).toMatch(/\.game-pile__layer:nth-child\(n \+ 4\) \{\s*display:\s*none/);
  });

  it("floors the pile buttons at a finger's width", () => {
    // The pile is the 42px compact card wide and nothing more, which is under the
    // touch minimum on the horizontal axis; the 4rem rail has the room to spare.
    expect(phonePortraitRules).toMatch(/:has\(> \.game-pile\)[^}]*\{[^}]*min-width:\s*44px/);
  });

  it("keeps the pile's depth layers off its caption", () => {
    // The layers are drawn 2.6px further down-right each and hang out of the
    // pile's box; being positioned they paint over what follows them in flow, and
    // the compact 2px gap put the caption's letters right there.
    expect(phonePortraitRules).toMatch(/\.game-pile \+ span \{[^}]*margin-top:\s*6px/);
  });

  it("keeps the end-turn orb inside the memory band", () => {
    // The overhang rides the divider on a desktop board. Here the band is barely
    // taller than the orb, and the half-rem below it was the slice of the circle
    // the player saw cut off.
    expect(phonePortraitRules).toMatch(/\.game-end-turn-orb \{\s*margin:\s*0 0\.25rem/);
  });

  it("gives the memory band the whole screen, on one line", () => {
    // Between the two rails the band had 262px of a 393px screen and the phase
    // pill took a third of that, which left the 21 chips 3px wide each. It bleeds
    // over the rails instead, and the orb rides the same line as the gauge —
    // the phone block's `display: block` dropped it onto a second one.
    expect(phonePortraitRules).toMatch(
      /\.game-battle-zones \{[^}]*overflow:\s*clip[^}]*overflow-clip-margin:\s*var\(--game-rail\)/,
    );
    expect(phonePortraitRules).toMatch(
      /\.game-battle-zones > div:nth-child\(2\) \{[^}]*display:\s*flex[^}]*margin-inline:\s*calc\(var\(--game-rail\) \* -1\)/,
    );
    expect(phonePortraitRules).toMatch(/\.game-memory-gauge__phase \{\s*display:\s*none/);
    expect(phonePortraitRules).toMatch(/\.game-memory-gauge \{[^}]*padding:\s*0 !important/);
  });

  it("pulls the card sparkles inside the card they belong to", () => {
    expect(phonePortraitRules).toMatch(/\.game-card-sparkles \{\s*inset:\s*-18% 0 45%/);
    expect(phonePortraitRules).toMatch(/\.game-card-sparkle \{\s*translate:\s*-50% 0/);
  });
});

describe("the mulligan sheet keeps the opening hand next to its copy", () => {
  it("stops the card grid centring itself in the track it sits in", () => {
    expect(phonePortraitRules).toMatch(/\.mulligan-cards \{\s*align-content:\s*start/);
  });
});

describe("the board-mode rail becomes a bottom sheet on a phone in portrait", () => {
  it("anchors the prompt above the hand instead of over the field", () => {
    expect(phonePortraitRules).toMatch(
      /\.board-prompt \{[^}]*top:\s*auto[^}]*bottom:\s*calc\(var\(--game-hand-h\)[^}]*translate:\s*none/,
    );
    // The rail's own entrance slides sideways from a vertical centring it no
    // longer has, so the sheet brings its own.
    expect(phonePortraitRules).toMatch(/\.board-prompt \{[^}]*animation-name:\s*battle-board-sheet-in/);
    expect(gameCss).toMatch(/@keyframes battle-board-sheet-in \{/);
    // The pending decision's only exit outranks anything transient.
    expect(phonePortraitRules).toMatch(/\.board-prompt \{[^}]*z-index:\s*calc\(var\(--ds-z-dialog\) - 3\)/);
    expect(phonePortraitRules).toMatch(/\.board-prompt__actions > button \{[^}]*min-height:\s*44px/);
  });

  it("leaves the landscape phone with the left rail it was tuned for", () => {
    expect(landscapeRules).not.toMatch(/\.board-prompt \{/);
  });
});

describe("a board-mode hand selection is answered by the finger that makes it", () => {
  it("takes the pick from the pointer instead of the click a touch may never send", () => {
    // The hand is a `pan-x` scroll-snap row on a phone, so the browser may turn a
    // tap into a scroll or retarget the trailing click at the row. Reading the
    // pointer is how every other tap on this screen is resolved (pressGesture.ts).
    expect(boardPiecesSource).toMatch(/onPointerUp=\{selection && pickable \? \(e\) => finishPick\(/);
    expect(boardPiecesSource).toMatch(/onPointerCancel=\{selection \?/);
    expect(boardPiecesSource).toMatch(/pressGesture\(\{ dx: event\.clientX - press\.x/);
    // The click trailing that same gesture must not toggle the card back, while a
    // click that is the only signal (keyboard, assistive) still picks.
    expect(boardPiecesSource).toMatch(/if \(pointerPicked\.current === entry\.instanceId\)/);
  });

  it("keeps the row pannable while it is a selection surface", () => {
    // Nothing is dragged out of a hand answering a decision, so `touch-action: none`
    // would only cost the row the sideways swipe that reaches the buried cards.
    expect(boardPiecesSource).toMatch(/cursor: pickable \? "pointer" : "default", touchAction: "pan-x"/);
  });

  it("still refuses to start a drag out of a hand that is picking", () => {
    // A pick that became a play would answer the decision by putting the card on
    // the board — the one thing the selection must not do.
    expect(boardPiecesSource).toMatch(/: \(e\) => startDrag\(i, e\)\n/);
    expect(boardPiecesSource).not.toMatch(/selection \? \(e\) => startDrag/);
  });
});

describe("centre-stage cards are sized by the viewport", () => {
  it("scales the zone showcase by width on a phone and by height in landscape", () => {
    expect(portraitRules).toMatch(/\.battle-showcase__art > div \{[^}]*width:\s*min\(190px, 46vw\)/);
    expect(landscapeRules).toMatch(/\.battle-showcase__art > div \{[^}]*height:\s*min\(58dvh, 266px\)/);
  });

  it("drives the security branch's lift from a property the short blocks retune", () => {
    // 8rem above the middle of a 390px board puts the card's top edge off screen.
    expect(gameCss).toMatch(/\.battle-security-branch \{[^}]*--security-branch-lift:\s*8rem/);
    expect(gameCss).toMatch(/@keyframes battle-security-branch \{[^}]*var\(--security-branch-lift\)/);
    expect(gameCss).not.toMatch(/translate:\s*[^;]*calc\(-50% - 8rem\)/);
    expect(landscapeRules).toMatch(/\.battle-security-branch \{[^}]*--security-branch-lift:\s*2\.5rem/);
    expect(landscapeRules).toMatch(/\.battle-security-branch__frame > div \{[^}]*width:\s*92px/);
  });
});

describe("the mulligan's three actions fit the row they are given", () => {
  it("wraps the peek button onto its own line at narrow widths only", () => {
    expect(narrowWidthRules).toBeDefined();
    expect(narrowWidthRules).toMatch(/\.mulligan-actions \{\s*flex-wrap:\s*wrap/);
    expect(narrowWidthRules).toMatch(/\.mulligan-actions > button:last-child \{\s*flex-basis:\s*100%/);
    // A landscape phone is ~844px wide and fits all three; wrapping there would
    // cost the 390px-tall sheet a whole button row for nothing.
    expect(landscapeRules).not.toMatch(/\.mulligan-actions \{/);
  });
});

describe("landscape phone match layout", () => {
  // A phone on its side is ~800px wide and ~390px tall. Keyed on width alone it
  // landed in the tablet layout: the fanned hand ate the screen, the board fell
  // off the bottom and the action strip collapsed to nothing.
  it("keys the phone layout on the short viewport as well as the narrow one", () => {
    expect(gameCss).toMatch(/@media \(width < 600px\), \(height < 520px\) and \(orientation: landscape\) \{/);
    expect(gameScreenSource).toMatch(
      /NARROW_LAYOUT_QUERY = "\(width < 600px\), \(height < 520px\) and \(orientation: landscape\)"/,
    );
  });

  it("gives the strip a column of its own beside the board", () => {
    expect(landscapeRules).toBeDefined();
    expect(landscapeRules).toMatch(/\.game-layout \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
    expect(landscapeRules).toMatch(/\.game-sidebar > div:nth-child\(2\) \{[^}]*width:\s*9rem/);
    // Same collapse as portrait: no action, no column.
    expect(landscapeRules).toMatch(
      /\.game-sidebar > div:nth-child\(2\):not\(:has\(button\)\) \{\s*display:\s*none !important/,
    );
  });

  it("puts the breeding area beside the hand instead of above it", () => {
    // Stacked, the two bands leave the battle rows nothing on a 390px screen.
    expect(landscapeRules).toMatch(/\.game-player-dock \{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\)/);
    expect(landscapeRules).toMatch(/\.game-breeding-dock > div:first-child \{\s*display:\s*none/);
  });

  it("keeps the memory band a single row", () => {
    // Stacked, the end-turn orb drops below the gauge and costs the battle rows
    // another 30px they do not have.
    expect(landscapeRules).toMatch(/\.game-battle-zones > div:nth-child\(2\) \{[^}]*display:\s*flex/);
  });

  it("lays the rail piles two to a row", () => {
    expect(landscapeRules).toMatch(/\.game-pile-column > div \{[^}]*flex-direction:\s*row !important/);
  });

  it("compacts the decision dialog instead of letting it swallow the board", () => {
    // Portrait's sheet is a badge, a display-size heading and a column of
    // full-width buttons — around 250px of a 390px screen.
    expect(landscapeRules).toMatch(/\.game-modal__panel > \.aegis-badge \{\s*display:\s*none !important/);
    expect(landscapeRules).toMatch(/\.game-modal__panel > h2 \{[^}]*font-size:\s*var\(--ds-text-lg\)/);
    // The affirmative action still ends up on the right, like every choice row.
    expect(landscapeRules).toMatch(
      /\.game-modal__panel > div:last-child:not\(\[class\]\) \{[^}]*flex-direction:\s*row-reverse/,
    );
  });

  it("keeps the result dialog's own buttons on screen", () => {
    expect(landscapeRules).toMatch(/\.game-over-dialog > div:first-child \{\s*display:\s*none !important/);
    expect(landscapeRules).toMatch(/\.game-over-dialog > h1 \{[^}]*font-size:\s*var\(--ds-text-2xl\)/);
  });

  it("keeps the turn orb a finger wide", () => {
    // 2.75rem is 44px. The extra overhang keeps the band exactly as tall as it
    // was, so the two battle rows lose nothing to the bigger target.
    expect(landscapeRules).toMatch(/\.game-end-turn-orb \{[^}]*width:\s*2\.75rem[^}]*margin:\s*-0\.375rem/);
  });

  it("names an explicit card width for the battle rows", () => {
    // Even the compact Digimon (106px) is taller than a row here.
    expect(gameScreenSource).toMatch(/const LANDSCAPE_PHONE_PERMANENT_WIDTH = \d+;/);
    expect(gameScreenSource).toMatch(/width=\{landscapePhone \? LANDSCAPE_PHONE_PERMANENT_WIDTH : undefined\}/);
  });
});
