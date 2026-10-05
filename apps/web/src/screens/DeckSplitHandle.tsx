/* The draggable divider between the card pool and the deck panel, and the quick
   width presets. The chosen width is a saved deck builder preference. */

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { Icons, type IconComponent } from "../design/icons";
import { useTranslation } from "../i18n";
import {
  DECK_SHARE_MAX,
  DECK_SHARE_MIN,
  DECK_SHARE_PRESETS,
  clampDeckShare,
  setDeckBuilderPreferences,
  useDeckBuilderPreferences,
} from "./deckBuilderPreferences";

const KEYBOARD_STEP = 0.02;

type Preset = keyof typeof DECK_SHARE_PRESETS;

/**
 * The deck panel's share of the workspace width, and a style that applies it.
 * A drag updates only this screen; the saved preference changes when it ends.
 */
export function useDeckShare() {
  const { deckShare } = useDeckBuilderPreferences();
  const [dragShare, setDragShare] = useState<number | null>(null);
  const share = dragShare ?? deckShare;
  const setShare = (next: number, persist = true) => {
    if (persist) {
      setDragShare(null);
      setDeckBuilderPreferences({ deckShare: next });
    } else {
      setDragShare(clampDeckShare(next));
    }
  };
  const style = { "--deck-share": share } as CSSProperties;
  return { share, setShare, style };
}

export function DeckSplitHandle({
  workspace,
  share,
  onShare,
}: {
  workspace: RefObject<HTMLDivElement | null>;
  share: number;
  onShare: (share: number, persist?: boolean) => void;
}) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const latest = useRef(share);
  latest.current = share;

  const shareAt = (clientX: number) => {
    const rect = workspace.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return latest.current;
    return (rect.right - clientX) / rect.width;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) onShare(shareAt(event.clientX), false);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    onShare(latest.current);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = {
      ArrowLeft: share + KEYBOARD_STEP,
      ArrowRight: share - KEYBOARD_STEP,
      Home: DECK_SHARE_MAX,
      End: DECK_SHARE_MIN,
    }[event.key];
    if (next == null) return;
    event.preventDefault();
    onShare(next);
  };

  return (
    <div
      className="deck-split"
      data-dragging={dragging}
      role="separator"
      aria-orientation="vertical"
      aria-label={t("deck.splitResize")}
      aria-valuemin={Math.round(DECK_SHARE_MIN * 100)}
      aria-valuemax={Math.round(DECK_SHARE_MAX * 100)}
      aria-valuenow={Math.round(share * 100)}
      aria-valuetext={t("deck.splitValue", { percent: Math.round(share * 100) })}
      tabIndex={0}
      title={t("deck.splitResize")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => onShare(DECK_SHARE_PRESETS.split)}
      onKeyDown={onKeyDown}
    >
      <span aria-hidden="true" />
    </div>
  );
}

export function DeckSplitPresets({ share, onShare }: { share: number; onShare: (share: number) => void }) {
  const { t } = useTranslation();
  const presets: { preset: Preset; label: string; Icon: IconComponent }[] = [
    { preset: "pool", label: t("deck.splitPool"), Icon: Icons.PanelPool },
    { preset: "split", label: t("deck.splitEven"), Icon: Icons.PanelSplit },
    { preset: "deck", label: t("deck.splitDeck"), Icon: Icons.PanelDeck },
  ];

  return (
    <div className="deck-segmented" role="group" aria-label={t("deck.splitPresets")}>
      {presets.map(({ preset, label, Icon }) => (
        <button
          key={preset}
          type="button"
          aria-pressed={Math.abs(share - DECK_SHARE_PRESETS[preset]) < 0.005}
          aria-label={label}
          title={label}
          onClick={() => onShare(DECK_SHARE_PRESETS[preset])}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
