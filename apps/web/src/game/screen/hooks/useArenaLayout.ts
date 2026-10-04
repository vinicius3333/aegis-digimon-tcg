import { COARSE_POINTER_QUERY, useMediaQuery } from "../../../design/useMediaQuery";
import { FieldLayout, useFieldLayout } from "../../../design/fieldLayout";
import { useFieldCardWidth } from "../layout/fieldCardWidth";
import { HAND_CARD_WIDTH_COMPACT, HAND_MIN_EXPOSURE_TOUCH } from "../../piece";
import {
  COMPACT_PILES_QUERY,
  DOCKED_VIEWER_PILES_QUERY,
  LANDSCAPE_PHONE_QUERY,
  NARROW_LAYOUT_QUERY,
  PORTRAIT_ARENA_QUERY,
  LANDSCAPE_PHONE_PERMANENT_WIDTH,
  SIDELINE_ARENA_QUERY,
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
  /** Pixel width of the egg deck, the raising slot and, beside the rows, each security card. */
  arenaRaisingWidth: number;
  /** The card width the sideline columns are spaced for, which a crowded row's narrowing does not change. */
  arenaSidelineBasisWidth: number;
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
  const organized = useFieldLayout() === FieldLayout.Organized;
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
  // Auxiliary desktop piles stay compact so the battle cards get the usable space.
  const arenaPileWidth = portraitArena
    ? tabletPortraitArena
      ? 62
      : organized
        ? narrowGameLayout
          ? 28
          : 44
        : shortPortraitArena
          ? 40
          : 44
    : landscapePhone || shortNarrowDock
      ? landscapePhone && organized
        ? 28
        : 44
      : 56;
  const arenaPermanentWidth = portraitArena
    ? tabletPortraitArena
      ? 88
      : organized
        ? 76
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
  const sidelineArena = useMediaQuery(SIDELINE_ARENA_QUERY);
  const fieldCardWidth = useFieldCardWidth();
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
    arenaRaisingWidth: sidelineArena ? (fieldCardWidth?.drawn ?? arenaPermanentWidth) : arenaPileWidth,
    arenaSidelineBasisWidth: sidelineArena ? (fieldCardWidth?.heightFitted ?? arenaPermanentWidth) : arenaPileWidth,
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
