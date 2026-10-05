# Mobile notice exploration — 2026-10-05

The rejected 320/390 captures put translucent 64px cards over the opponent utility dock. Three lines of small copy compete with the playmat, and a 24px-wide close target consumes scarce text width. The original Aegis typography, navy panels, cyan/blue borders, playmat, fields, memory gauge, raising area and hand remain the reference.

## Research

[Fluent toast guidance](https://fluent2.microsoft.design/components/web/react/core/toast/usage) recommends predictable placement that avoids main content, brief titles and skimmable bodies. Our inference is to keep the two established semantic lanes, truncate the preview, and let a deliberate tap open the full occurrence. Its notification-center recommendations do not justify adding a history feed here.

The [Material snackbar component page](https://m3.material.io/components/snackbar/guidelines) is a background reference. It rendered as JavaScript-only in this session, so no detailed placement or accessibility recommendation is attributed to it. The requirement for two left and two right notices independently excludes a single shared snackbar.

[W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) recommends 44×44px targets. The whole 48px toast becomes one target; dismissal moves to a 44px-minimum detail action. [W3C modal dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) specifies focus containment, Escape, a visible close action and focus return. We reuse the existing dialog, keeping the selected occurrence after live expiry.

## Directions

| Direction                        | 320px board                                                                | 375/390px board                                                | Decision                                                    |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| A: compact side cards            | Narrow copy requires ellipsis; full-card tap avoids cramped close controls | More source/clause visible; smaller opaque panels read clearly | Selected: closest to reduced desktop notifications          |
| B: compact rail + overflow count | Saves width but an overflow count implies access to additional history     | Count competes with card/count badges already present          | Reject: extra state and misleading affordance outside scope |
| C: edge field strip              | Dense strip competes with utility/field boundaries                         | Clear timing but more visual framing than needed               | Reject: weaker distinction from board furniture             |

The first implementation explored 20px art, 48px cards and 100px fixed overlay lanes. The occupied 320×568 board showed that these lanes trade utility-dock occlusion for field/memory-control occlusion. The coordinator authorized a permanent 48px gutter with two independently tappable cards paired horizontally in each physical side. Existing semantic routing stays intact: clauses left, card panels right; each occurrence retains its player ownership and original lifetime. Decisions do not resize the lanes. There is no new queue, timing rule or history surface.

## Further exploration and final direction

The user rejected the initial concepts and asked for more creative alternatives. Six additional original built-in imagegen concepts were produced and inspected:

- [D — field tickets](d-field-tickets.png): corner brackets and action-first copy.
- [E — edge bookmarks](e-edge-bookmarks.png): asymmetric corners and a source spine.
- [F — folded card tabs](f-folded-card-tabs.png): card-like folded framing.
- [G — type signals](g-type-signals.png): a pale typographic surface with almost no framing.
- [H — source seals](h-source-seals.png): circular source art with attached action captions.
- [I — event ribbons](i-event-ribbons.png): pale-cyan captions, dark ink and an outer notch.

Exact prompts are in [revision-prompts.json](revision-prompts.json), [folded-tab-prompt.txt](folded-tab-prompt.txt), and [alternative-family-prompts.json](alternative-family-prompts.json). D–F did not differ enough from the earlier navy framing. G incorrectly connects the captions into a banner; H enlarges the art and omits occupied utilities. I was initially the strongest exploratory direction, but its generated vertical arrangement cannot establish actual field clearance.

The latest direct user instruction is **use the existing system design, do not invent new designs**. That supersedes the exploratory ribbon selection. The implemented compact cards reuse Aegis battle-panel surfaces, borders, radius, foreground and typography; no generated image, novel pale-cyan caption identity or new asset ships. They have 16px source art, a quiet truncated event title and a truncated action line. Full source names and original clauses remain in the accessible label/detail dialog. There are two independent 48px targets per physical lane, horizontally paired in a permanent 48px gutter below the opponent header. Empty lanes retain their geometry. Dismissal is available in the existing modal, with a 44px target.

The shortest portrait tier reclaims battle-row vertical padding before applying a local field scroll floor. Hand sizes, raising controls and memory controls retain their existing layout. The development toolbar consumes additional height, so the diagnostic validates both the production-sized game area (only the development toolbar hidden) and the original toolbar stress layout. Decorative badges and glows are distinguished from the measured card-art boxes. The focused probe compares occupied art with/without the gutter and checks that no art is vertically cropped, in addition to notice caps, empty/decision lane stability, native hit targets, modal focus/Escape, retained details and reduced motion.

A separate requested wording correction uses the existing hand-origin movement key: English **Discarded cards from hand**, Portuguese **Cartas descartadas da mão**. Non-hand trash movements keep their existing descriptions.

## Original imagegen artifacts

Generated with the built-in `image_gen` tool using the inspected existing 390px Aegis capture as reference. Exact requests are in [prompts.json](prompts.json).

- [A — compact side cards](a-compact-side-cards.png)
- [B — rail and count](b-rail-count.png)
- [C — edge field strips](c-edge-field-strip.png)

These are design explorations, not screenshots of the implementation. A omits the second row and opponent utility dock; B collapses the right notices and invents expiry copy; C retains some old notices and invents a decision caption. Their generated card art/text is never shipped. Browser evidence of the real React/CSS implementation is the acceptance source.

## Verified implementation evidence

Base: `4266ec62f5c02930a85e8be148c12d0175c8d05c`. The child implementation changes only compact notice rendering/styles, its focused tests/probe, and the two hand-discard translations. GameScreen, animation timing, queues, occurrence IDs, desktop layout, engine, card/audio assets and the parent checkout are unchanged.

- Focused suites: **83 tests passed** across CompactNarration, NarrationStack, NoticeStack and sidePanels; the final CompactNarration rerun passed all **9 tests**, including the rejection reason preview and focus return after expiry.
- Reviewer-requested existing hand-title regressions were updated; SidePanelStack and sidePanels passed **47 tests**. Across the five focused suites there are **96 distinct tests**; repeated runs are not counted as additional tests.
- Exact source checks: web TypeScript, scoped oxlint, oxfmt check and `git diff --check` passed with Node 26.
- Strict browser receipt: `.local/motion-reference/mobile-toasts-final-strict/capture.json` contains **14 successful layouts**, each of seven viewports with the production-sized game area and original development-toolbar stress area: 320×568, 320×740, 375×812, 390×844, 768×1024, 844×390 and 1440×900.
- The receipt preserves before/after occupied card-art rectangles and actual clipping ancestors. It asserts two entries per physical side, 44px notice targets, no toast interception of card/utility/memory or decision controls, fixed decision/rejection/empty-lane boxes, horizontal clearance, modal focus/Escape, full detail persistence after expiry and reduced motion.
- Actual captures use `toasts-{production|dev-toolbar}-{width}x{height}.png`, `details-...png` and `order-...png` in that same directory. The 320×568 cases also have `field-scrolled-...png`, proving the raising dock is reachable with local field scrolling.

**Short-screen limit:** the organized field retains its existing 78px row floor. At 320×568 the field is 352px high with 364px of content (12px local scroll); the original development toolbar reduces it to 308px (56px local scroll). This is confined to the field. Battle-card art fits its rows/clipping ancestors, hand/raising/memory controls retain their sizes, and the 48px gutter remains fixed. Scrolling intentionally moves part of the opposite utility row out of view; the claim is reachable controls and intact battle-card art, not the entire board being visible simultaneously. At 320×740 the field requires no vertical scroll. Sideways scrolling remains within the existing card lanes, with no document-width overflow. These are geometry/interaction checks using supplemental notification records on the actual Arena board, not engine-rule or native frame-performance evidence.

All nine imagegen PNGs are original design explorations with saved prompts. They are intentionally retained as rejected concepts; final UI screenshots are the acceptance evidence. Parent integration and final combined native animation capture are owned by the coordinator.
