/**
 * Phone layout: touch sheets, compact everything. Mirrors the CSS block of the
 * same name as `NARROW_LAYOUT_QUERY` — a phone on its side is ~800px wide, so
 * the layout is keyed on the short viewport as well, or a landscape phone
 * would fall into the pointer layout and lose the action strip along with
 * every touch sheet.
 */
export const NARROW_LAYOUT_QUERY = "(width < 600px), (height < 520px) and (orientation: landscape)";

/**
 * Tablet and split-screen widths. The board keeps its pointer interactions but the
 * piles shrink, because the sidebar moves under the board and leaves the rails too
 * short to hold four full-size piles.
 */
export const COMPACT_PILES_QUERY = "(width < 960px), (height < 520px) and (orientation: landscape)";

/**
 * A board this short cannot show a full-size Digimon in each battle row, so the
 * permanents drop to their compact size rather than being clipped by the row.
 */
export const SHORT_BOARD_QUERY = "(height < 820px)";

/**
 * A landscape desktop or tablet without the tall arena layout (at least 1024px wide and
 * 760px tall): the right rail cannot stack the opponent's eggs, raising area and
 * security over the viewer's deck and trash, and the trash fell off the bottom of the
 * field. The deck and trash move into the bottom strip instead. Phones have their own
 * layouts.
 */
export const DOCKED_VIEWER_PILES_QUERY =
  "(min-width: 600px) and (min-height: 520px) and (max-height: 759px) and (orientation: landscape), " +
  "(min-width: 600px) and (max-width: 1023px) and (min-height: 520px) and (orientation: landscape)";

/**
 * The portrait arena: phones and tablets held upright stack each side's zones in
 * one row, and the battlefield switches to its portrait art.
 */
/**
 * A laptop or wider desktop with the tall arena. Each side's security stands beside its
 * raising area instead of between the battle rows, and both match a Digimon's size.
 * Mirrors the CSS block of the same condition in desktopSidelines.css.
 */
export const SIDELINE_ARENA_QUERY = "(min-width: 1280px) and (min-height: 760px)";

export const PORTRAIT_ARENA_QUERY = "(max-width: 1023px) and (orientation: portrait)";

/**
 * A phone on its side, or a landscape window too narrow for the tablet layout. Both
 * battle rows, the memory band, the dock and the header share ~390px, which is under
 * what even a compact Digimon needs, so the battle rows name their own card width.
 */
export const LANDSCAPE_PHONE_QUERY =
  "(width < 600px) and (orientation: landscape), (height < 520px) and (orientation: landscape)";

/** Card width in a battle row on a landscape phone. */
export const LANDSCAPE_PHONE_PERMANENT_WIDTH = 58;
