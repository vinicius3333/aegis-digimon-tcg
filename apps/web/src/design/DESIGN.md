# Aegis interface design contract

This document is the canonical design intent for the Aegis web client. The
compiled values live in `tokens.css`; components must keep both sources aligned.

## Atmosphere and product character

Aegis is a calm, minimal operational tabletop client. It should feel deliberate
and precise, with enough personality to belong to a competitive card game
without turning every screen into a sci-fi HUD. Hierarchy comes from typography,
spacing, alignment and grouping before containers or effects. Surfaces are
quiet, borders are fine, elevation is rare, and gameplay color is reserved for
cards, players, legal targets, and meaningful status. Decorative chrome must
never compete with the current action.

Every visual element must earn its place through navigation, grouping, state or
feedback. Avoid nested cards, ornamental gradients, glow, duplicate labels and
icons that merely repeat nearby text. Prefer one boundary around a meaningful
region to a separate panel around every item.

## Color roles

The interface uses semantic surface, foreground, border, accent, and status
roles. Light and dark themes change the values of those roles rather than
restyling individual components. The seven gameplay colors in `theme.ts` are
domain identity colors, not substitutes for success, warning, danger, or focus.

Normal text must reach 4.5:1 contrast and large text 3:1 against the paired
surface. Status is always reinforced with a label, icon, position, or shape.

## Typography and hierarchy

Bricolage Grotesque carries authored headings, Inter carries interface copy,
Fira Code carries counts and telemetry, and Tektur is limited to the brand
wordmark. Each visible region has one dominant entry point. Scale is combined
with spacing, weight, tracking, or alignment so hierarchy does not depend on
font size alone.

Use no more than three simultaneous visual levels in a region: primary,
secondary, and incidental. Memory, costs, counts, and phase readouts use tabular
numbers.

## Spacing, containers, and grids

Spacing follows a 4 px base with named 4, 8, 12, 16, 20, 24, 32, 40, and 48 px
steps. Use 8–12 px inside a conceptual group and 32–48 px between major groups.
Uniform spacing between every block is not acceptable because it erases
grouping.

Content uses responsive gutters and a 1280 px maximum container. App chrome is
viewport-driven; reusable panels and card grids use container queries when
their parent controls available width.

## Responsive composition

Aegis renders one React application at every width. Responsive behavior changes
composition, density, and progressive disclosure; it never selects a second
business flow.

- Narrow phone: bottom navigation, one-column reading order, sheets for
  secondary tools, high-frequency actions in the thumb area.
- Large phone/tablet: compact navigation and one/two-region hybrids.
- Compact desktop: top navigation with reduced secondary panels.
- Wide desktop: authored multi-panel grids with persistent supporting context.

The layout must work from 320 px wide, in landscape phone, at 200% zoom, and
with long English and Portuguese strings. Breakpoints follow content pressure,
not device names.

## Components and interaction states

Shared buttons, icon buttons, panels, badges, navigation, dialogs, sheets,
notices, and empty/error/loading states own their visual grammar. Feature code
supplies meaning and callbacks. Native HTML is preferred over invented ARIA.

Every control has default, hover where applicable, pressed, focus-visible,
disabled, and pending behavior. Phone targets aim for 44 px and never fall
below the 24 px WCAG AA floor. Hover is enhancement only.

## Navigation

Home, Play, Decks, and Cards are the primary destinations. Settings and profile
remain reachable without competing with play. Wide layouts use top navigation;
narrow layouts use bottom navigation. Both are presentations of the same item
model, active state, translated labels, and navigation callback.

Changing viewport width must not reset the current screen, draft, filter,
selection, or server decision.

## Match-board priorities

The match board prioritizes, in order: current phase/turn and required decision;
selected object and legal target; synchronized zones and memory; high-frequency
actions; counts, logs, and secondary telemetry. Narrow layouts move secondary
information into sheets while retaining the same controller and intent path.

Animation never performs a game-state change. It may confirm a state already
received from the authoritative server.

## Motion

Use 50–100 ms for direct press feedback, 150 ms for hover and ordinary state
confirmation, 180–260 ms for dialogs and sheets, and at most 500 ms for a major
container transition. Use strong ease-out curves for value/color changes and a
restrained physical curve for short transforms.

Under `prefers-reduced-motion: reduce`, remove translation, scale, rotation,
parallax, particles, and ambient drift. Preserve static color, label, position,
and opacity cues. No functional surface may contain indefinite decorative
motion.

## State coverage

Every surface that loads, filters, transforms, or accepts data accounts for
loading, empty, error, populated, and edge states. Forms additionally account
for untouched, dirty-valid, invalid, and submitted-pending states. Errors say
what happened, why when known, and what the player can do next while preserving
input.

## Accessibility

DOM and focus order follow meaning even when CSS changes visual placement.
Icon-only buttons have accessible names. Dialogs and sheets manage initial
focus, containment, Escape behavior when dismissible, and focus return. Required
server decisions cannot be dismissed accidentally. Live updates use polite or
assertive regions according to severity.

Decorative sigils and ambient effects are hidden from assistive technology.
Information is never communicated by gameplay color or animation alone.

## Anti-patterns

- Do not render complete desktop and mobile screen copies and hide one with CSS.
- Do not branch product routing on `window.innerWidth`.
- Do not hardcode repeated colors, spacing, radii, shadows, or motion in TSX.
- Do not use gameplay colors as generic interface status.
- Do not squeeze multi-panel desktop layouts onto a phone.
- Do not make drag, hover, color, or animation the only interaction signal.
- Do not add decorative dashboards, fake metrics, or rules invented by a mockup.
- Do not move legality or authoritative game behavior into the client.
