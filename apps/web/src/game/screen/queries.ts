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
 * A phone on its side. Both battle rows, the memory band, the dock and the
 * header share ~390px, which is under what even a compact Digimon needs, so the
 * battle rows name their own card width.
 */
export const LANDSCAPE_PHONE_QUERY = "(height < 520px) and (orientation: landscape)";

/** Card width in a battle row on a landscape phone. */
export const LANDSCAPE_PHONE_PERMANENT_WIDTH = 58;
