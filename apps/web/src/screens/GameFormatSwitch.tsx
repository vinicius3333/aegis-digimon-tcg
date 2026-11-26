import { Icons } from "@/design/icons";
import { useMediaQuery } from "@/design/useMediaQuery";
import { useTranslation } from "@/i18n/useTranslation";
import { createDeckFormat, deckFormatSettings, type DeckFormat } from "@aegis/shared/deckFormat";
import "./gameFormatSwitch.css";

export function GameFormatSwitch({
  value,
  onChange,
  disabled = false,
  size = "full",
  alysionLockedReason,
}: {
  value: DeckFormat;
  onChange: (format: DeckFormat) => void;
  disabled?: boolean;
  size?: "full" | "compact";
  alysionLockedReason?: string;
}) {
  const { t } = useTranslation();
  const compact = useMediaQuery("(width < 600px)");
  const { set, rules } = deckFormatSettings(value);
  const alysion = set === "alysion";
  return (
    <div
      className="game-format-switch"
      data-game={alysion ? "alysion" : "card-game"}
      data-size={size}
      role="radiogroup"
      aria-label={t("deckFormat.game")}
    >
      <button
        type="button"
        role="radio"
        aria-checked={!alysion}
        disabled={disabled}
        className="game-format-switch__option"
        onClick={() => onChange(createDeckFormat("all", rules))}
      >
        <Icons.Cards size={16} />
        <span>{t("deckFormat.cardGame")}</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={alysion}
        disabled={disabled || alysionLockedReason !== undefined}
        title={alysionLockedReason}
        className="game-format-switch__option"
        onClick={() => onChange(createDeckFormat("alysion", rules))}
      >
        <Icons.Devices size={16} />
        <span>{t(compact || size === "compact" ? "deckFormat.alysionShort" : "deckFormat.alysion")}</span>
        <span className="game-format-switch__new">{t("deckFormat.newTag")}</span>
      </button>
    </div>
  );
}
