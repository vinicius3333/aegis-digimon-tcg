/* The strip along the bottom: the raising area on a wide screen, then the action bar
   and the hand, then the viewer's own counters. A portrait phone moves the raising
   area up into the field, so the dock takes it as a slot rather than rendering it. A
   short desktop moves the deck and trash down from the right rail the same way. */

import type { ReactNode, RefObject } from "react";
import { ArenaCounters } from "../../ArenaCounters";
import { Hand, type HandEntry } from "../../piece";
import { Side } from "../../side";
import { ActionBar } from "./ActionBar";
import { PlayerLine } from "./PlayerLine";

export function PlayerDock({
  playerName,
  playerAvatarId,
  breedingDock,
  pileDock,
  handDockRef,
  cardWidth,
  minExposure,
  cards,
  selectedInstanceId,
  effectSourceInstanceId,
  selection,
  draggingInstanceId,
  shakeInstanceId,
  actionBar,
  reserveActionBarSpace = false,
  eggDeckCount,
  handCount,
  deckCount,
  trashCount,
  startDrag,
  selectCard,
  onHoverChange,
}: {
  /** The viewer's name for the line over the tray, when the screen knows it. */
  playerName?: string;
  playerAvatarId?: string;
  /** The board is showing the viewer's own turn, so their line does not wait. */
  /** The raising area, when this screen puts it here rather than in the field. */
  breedingDock: ReactNode;
  /** The deck and trash, when this screen puts them here rather than in the rail. */
  pileDock: ReactNode;
  handDockRef: RefObject<HTMLDivElement | null>;
  cardWidth: number;
  minExposure?: number;
  cards: HandEntry[];
  selectedInstanceId?: string;
  effectSourceInstanceId?: string;
  selection?: {
    selectableInstanceIds: readonly string[];
    pickedInstanceIds: readonly string[];
    onToggle: (instanceId: string) => void;
    onInspect: (instanceId: string) => void;
  };
  draggingInstanceId?: string;
  shakeInstanceId?: string;
  /** What the bar above the hand says, or nothing while an attacker is chosen. */
  actionBar: { selCardId?: string; hasBase: boolean; linkingCardId?: string; onCancel: () => void } | undefined;
  /** Keep the desktop dock height stable while a field decision replaces the action bar. */
  reserveActionBarSpace?: boolean;
  eggDeckCount: number;
  handCount: number;
  deckCount: number;
  trashCount: number;
  startDrag: (index: number, event: React.PointerEvent) => void;
  selectCard: (index: number) => void;
  onHoverChange: (instanceId: string | undefined) => void;
}) {
  const counters = (
    <ArenaCounters side={Side.Viewer} eggs={eggDeckCount} hand={handCount} deck={deckCount} trash={trashCount} />
  );
  return (
    <footer
      className="game-player-dock"
      style={{
        position: "relative",
        flexShrink: 0,
        borderTop: "1px solid var(--ds-border)",
        background: "var(--ds-surface)",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {breedingDock}
      {playerName ? <PlayerLine name={playerName} avatarId={playerAvatarId} side="player" /> : null}
      <div className="game-hand-dock" ref={handDockRef} style={{ flex: 1, minWidth: 0, padding: "8px 20px 12px" }}>
        {actionBar ? (
          <ActionBar
            selCardId={actionBar.selCardId}
            hasBase={actionBar.hasBase}
            linkingCardId={actionBar.linkingCardId}
            onCancel={actionBar.onCancel}
          />
        ) : reserveActionBarSpace ? (
          <div className="game-action-bar game-action-bar--idle" aria-hidden />
        ) : null}
        <Hand
          cardWidth={cardWidth}
          minExposure={minExposure}
          cards={cards}
          selectedInstanceId={selectedInstanceId}
          effectSourceInstanceId={effectSourceInstanceId}
          selection={selection}
          startDrag={startDrag}
          selectCard={selectCard}
          draggingInstanceId={draggingInstanceId}
          shakeInstanceId={shakeInstanceId}
          onHoverChange={onHoverChange}
        />
      </div>
      {pileDock ? (
        // The counters stack under the docked deck and trash, so the column is as wide as
        // the wider of the two and the hand never reaches under either.
        <div className="game-viewer-pile-dock">
          {pileDock}
          {counters}
        </div>
      ) : (
        counters
      )}
    </footer>
  );
}
