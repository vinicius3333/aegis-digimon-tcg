import { Field } from "@/design/primitives";
import type { Translate } from "@/i18n/translationTypes";

type Props = {
  t: Translate;
  sub: "create" | "join";
  onSub: (sub: "create" | "join") => void;
  roomCode: string;
  onRoomCode: (code: string) => void;
  codeLabel?: string;
  codeLength?: number;
  disabled?: boolean;
};

export function PrivateSidebar({
  t,
  sub,
  onSub,
  roomCode,
  onRoomCode,
  codeLabel,
  codeLength = 6,
  disabled = false,
}: Props) {
  return (
    <div className="lobby-private">
      <div className="lobby-private-toggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={sub === "create"}
          className={sub === "create" ? "is-selected" : undefined}
          disabled={disabled}
          onClick={() => onSub("create")}
        >
          {t("lobby.create")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sub === "join"}
          className={sub === "join" ? "is-selected" : undefined}
          disabled={disabled}
          onClick={() => onSub("join")}
        >
          {t("lobby.join")}
        </button>
      </div>
      {sub === "create" ? (
        <p className="lobby-private__hint">{t("lobby.createHint")}</p>
      ) : (
        <>
          <p className="lobby-private__hint">{t("lobby.joinHint")}</p>
          <Field
            className="lobby-room-field"
            label={codeLabel ?? t("lobby.roomCodePlaceholder")}
            name="roomCode"
            autoComplete="off"
            spellCheck={false}
            value={roomCode}
            onChange={(event) => onRoomCode(event.target.value.toUpperCase())}
            placeholder={codeLabel ?? t("lobby.roomCodePlaceholder")}
            maxLength={codeLength}
            disabled={disabled}
          />
        </>
      )}
    </div>
  );
}
