import type { MatchEmote } from "@aegis/shared";

export function EmoteIcon({ emote, size }: { emote: MatchEmote; size: number }) {
  return (
    <img
      className="match-chat-emote-icon"
      src={`/emotes/digimon-world-1/${emote}.png`}
      width={size}
      height={size}
      alt=""
      draggable={false}
      onError={(event) => {
        event.currentTarget.hidden = true;
      }}
    />
  );
}
