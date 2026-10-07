import { useEffect, useRef } from "react";
import { Switch } from "../../design/primitives";
import { useTranslation } from "../../i18n";
import { useDismissOnOutsidePress } from "./useDismissOnOutsidePress";
import type { MatchChat } from "./useMatchChat";

/** The chat's settings, opened from the kebab button in the title bar. */
export function ChatSettingsMenu({
  chat,
  spectating,
  anchor,
  onClose,
}: {
  chat: MatchChat;
  spectating: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  useDismissOnOutsidePress(menuRef, anchor, onClose);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  return (
    <div
      ref={menuRef}
      className="match-chat-settings"
      role="group"
      aria-label={t("chat.settings")}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
        anchor?.focus();
      }}
    >
      {/* A spectator has no opponent; muting either player would only hide half the match. */}
      {spectating ? null : (
        <Switch checked={chat.mutedOpponent} label={t("chat.mute")} onChange={chat.setMutedOpponent} />
      )}
      <Switch checked={chat.mutedSpectators} label={t("chat.muteSpectators")} onChange={chat.setMutedSpectators} />
    </div>
  );
}
