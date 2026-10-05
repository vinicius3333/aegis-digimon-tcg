/* A player's name as one thin line: the opponent's in the top bar, the viewer's
   on the hand tray, after their portrait. Animated dots mark a player who is
   taking their turn, the way a typing indicator reads in a chat. A name past
   `maxLength` is cut, and tapping it shows the whole name. */

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { isDigimonWorldAvatarId } from "@aegis/shared";
import { Avatar } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";
import { useAnchoredTooltip } from "../../useAnchoredTooltip";

export function PlayerLine({
  name,
  avatarId,
  side,
  playing = false,
  maxLength,
  timer,
}: {
  name: string;
  avatarId?: string;
  side: "player" | "opponent";
  playing?: boolean;
  maxLength?: number;
  timer?: ReactNode;
}) {
  const { t } = useTranslation();
  const { tooltipId, open, show, closeSoon, cancelClose } = useAnchoredTooltip<"name">({
    preferAbove: side === "player",
  });
  const characters = Array.from(name);
  const shortened = maxLength !== undefined && characters.length > maxLength;
  return (
    <div className="game-player-line" data-side={side} data-timed={timer ? true : undefined}>
      <span className="game-player-line__avatar">
        <Avatar name={name} avatarId={isDigimonWorldAvatarId(avatarId) ? avatarId : null} size={18} />
      </span>
      {shortened ? (
        <button
          type="button"
          className="game-player-line__name"
          aria-label={name}
          aria-describedby={open ? tooltipId : undefined}
          onMouseEnter={(event) => show("name", event.currentTarget)}
          onMouseLeave={closeSoon}
          onFocus={(event) => show("name", event.currentTarget)}
          onBlur={closeSoon}
          onClick={(event) => show("name", event.currentTarget)}
        >
          {`${characters.slice(0, maxLength - 1).join("")}…`}
        </button>
      ) : (
        <span className="game-player-line__name">{name}</span>
      )}
      {playing ? (
        <span className="game-player-line__waiting">
          <span className="aegis-sr-only">{t("game.playing")}</span>
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </span>
      ) : null}
      {timer}
      {open &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="game-arena-counter-tooltip"
            data-above={open.above}
            style={{ left: open.left, top: open.top }}
            onMouseEnter={cancelClose}
            onMouseLeave={closeSoon}
          >
            {name}
          </span>,
          document.body,
        )}
    </div>
  );
}
