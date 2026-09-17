import { COARSE_POINTER_QUERY, useMediaQuery } from "../../../design/useMediaQuery";
import { HAND_CARD_WIDTH_COMPACT, HAND_MIN_EXPOSURE_TOUCH } from "../../piece";
import { COMPACT_PILES_QUERY, LANDSCAPE_PHONE_QUERY, NARROW_LAYOUT_QUERY, SHORT_BOARD_QUERY } from "../queries";

/** Everything about the board that the viewport alone decides. */
export type ArenaLayout = {
  narrowGameLayout: boolean;
  /** Piles shrink: the sidebar has moved under the board and the rails are short. */
  compactPiles: boolean;
  /** No room for a full-size Digimon in each battle row. */
  shortBoard: boolean;
  portraitArena: boolean;
  landscapePhone: boolean;
  coarsePointer: boolean;
  /** Notices stack under the board instead of beside it. */
  collapseNotices: boolean;
  /** Pixel width of a deck, trash or security pile. */
  arenaPileWidth: number;
  /** Pixel width of a permanent on the field. */
  arenaPermanentWidth: number;
  /** Pixel width of a card in the hand fan. */
  handCardWidth: number;
  /** How much of a covered hand card stays visible, where a finger needs the target. */
  handMinExposure: number | undefined;
};

/**
 * The board's measurements for the current viewport.
 *
 * The widths are picked rather than computed: each breakpoint was chosen against the real
 * board, and a formula that happened to fit them would claim a relationship the design does
 * not have.
 */
export function useArenaLayout(): ArenaLayout {
  const narrowGameLayout = useMediaQuery(NARROW_LAYOUT_QUERY);
  const compactPiles = useMediaQuery(COMPACT_PILES_QUERY);
  const shortBoard = useMediaQuery(SHORT_BOARD_QUERY);
  const portraitArena = useMediaQuery("(max-width: 1023px) and (orientation: portrait)");
  const shortPortraitArena = useMediaQuery("(max-width: 1023px) and (orientation: portrait) and (height < 650px)");
  const mediumPortraitArena = useMediaQuery(
    "(max-width: 1023px) and (orientation: portrait) and (min-height: 650px) and (max-height: 759px)",
  );
  const tabletPortraitArena = useMediaQuery("(min-width: 600px) and (max-width: 1023px) and (orientation: portrait)");
  const compactArena = useMediaQuery("(height < 950px)");
  const tightArena = useMediaQuery("(height < 875px)");
  const arenaPileWidth = portraitArena
    ? tabletPortraitArena
      ? 62
      : shortPortraitArena
        ? 40
        : 44
    : compactPiles
      ? 56
      : 72;
  const arenaPermanentWidth = portraitArena
    ? tabletPortraitArena
      ? 88
      : shortPortraitArena
        ? 48
        : mediumPortraitArena
          ? 60
          : 76
    : shortBoard
      ? 76
      : tightArena
        ? 84
        : compactArena
          ? 100
          : 116;
  const landscapePhone = useMediaQuery(LANDSCAPE_PHONE_QUERY);
  const coarsePointer = useMediaQuery(COARSE_POINTER_QUERY);
  const collapseNotices = narrowGameLayout && !landscapePhone;
  return {
    narrowGameLayout,
    compactPiles,
    shortBoard,
    portraitArena,
    landscapePhone,
    coarsePointer,
    collapseNotices,
    arenaPileWidth,
    arenaPermanentWidth,
    handCardWidth: portraitArena
      ? tabletPortraitArena
        ? 104
        : shortPortraitArena
          ? 44
          : mediumPortraitArena
            ? 60
            : 76
      : compactPiles
        ? HAND_CARD_WIDTH_COMPACT
        : 112,
    handMinExposure: portraitArena || compactPiles ? HAND_MIN_EXPOSURE_TOUCH : undefined,
  };
}
