import { COARSE_POINTER_QUERY, useMediaQuery } from "../../../design/useMediaQuery";
import { HAND_CARD_WIDTH_COMPACT, HAND_MIN_EXPOSURE_TOUCH } from "../../piece";
import {
  COMPACT_PILES_QUERY,
  DOCKED_VIEWER_PILES_QUERY,
  LANDSCAPE_PHONE_QUERY,
  NARROW_LAYOUT_QUERY,
  PORTRAIT_ARENA_QUERY,
  LANDSCAPE_PHONE_PERMANENT_WIDTH,
  SHORT_BOARD_QUERY,
} from "../queries";

/** Everything about the board that the viewport alone decides. */
export type ArenaLayout = {
  narrowGameLayout: boolean;
  /** Piles shrink: the sidebar has moved under the board and the rails are short. */
  compactPiles: boolean;
  /** The viewer's deck and trash sit in the bottom strip, not in the right rail. */
  dockViewerPiles: boolean;
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
  const dockViewerPiles = useMediaQuery(DOCKED_VIEWER_PILES_QUERY);
  const shortBoard = useMediaQuery(SHORT_BOARD_QUERY);
  const portraitArena = useMediaQuery(PORTRAIT_ARENA_QUERY);
  const shortPortraitArena = useMediaQuery("(max-width: 1023px) and (orientation: portrait) and (height < 650px)");
  const mediumPortraitArena = useMediaQuery(
    "(max-width: 1023px) and (orientation: portrait) and (min-height: 650px) and (max-height: 759px)",
  );
  // The tablet sizes need a tall screen; a shorter portrait window takes the phone tiers.
  const tabletPortraitArena = useMediaQuery(
    "(min-width: 600px) and (max-width: 1023px) and (orientation: portrait) and (min-height: 800px)",
  );
  const compactArena = useMediaQuery("(height < 950px)");
  // Under this height a rail cannot stack two full-size piles over a security shield.
  const shortRails = useMediaQuery("(height < 640px) and (orientation: landscape)");
  const tightArena = useMediaQuery("(height < 875px)");
  // Just above the phone layout, full-size hand cards leave the field too short for both battle rows.
  const shortDock = useMediaQuery("(min-height: 520px) and (max-height: 559px) and (orientation: landscape)");
  const landscapePhone = useMediaQuery(LANDSCAPE_PHONE_QUERY);
  // A phone on its side with the browser's bars showing: two rails of piles and two battle rows
  // share about 180px, so the pieces take one size down.
  const shortLandscapePhone = useMediaQuery("(height < 360px) and (orientation: landscape)");
  // A narrow docked board under 600px tall keeps its rails single file, so the piles shrink to fit.
  const shortNarrowDock = useMediaQuery(
    "(min-width: 600px) and (max-width: 759px) and (min-height: 520px) and (max-height: 599px) and (orientation: landscape)",
  );
  // A docked full-size deck is too tall for the counters that sit under it in the bottom strip.
  const arenaPileWidth = portraitArena
    ? tabletPortraitArena
      ? 62
      : shortPortraitArena
        ? 40
        : 44
    : shortLandscapePhone || shortNarrowDock
      ? 44
      : compactPiles || shortRails || dockViewerPiles
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
    : landscapePhone
      ? shortLandscapePhone
        ? 42
        : LANDSCAPE_PHONE_PERMANENT_WIDTH
      : shortBoard
        ? 76
        : tightArena
          ? 84
          : compactArena
            ? 100
            : 116;
  const coarsePointer = useMediaQuery(COARSE_POINTER_QUERY);
  const collapseNotices = narrowGameLayout && !landscapePhone;
  return {
    narrowGameLayout,
    compactPiles,
    dockViewerPiles,
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
      : shortDock
        ? 76
        : compactPiles
          ? HAND_CARD_WIDTH_COMPACT
          : 112,
    handMinExposure: portraitArena || compactPiles ? HAND_MIN_EXPOSURE_TOUCH : undefined,
  };
}
