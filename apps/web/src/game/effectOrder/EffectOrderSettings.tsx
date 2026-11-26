import { useId } from "react";
import { setEffectOrderEnabled } from "@/game/effectOrder/effectOrderEnabled/setEffectOrderEnabled";
import { useEffectOrderEnabled } from "@/game/effectOrder/effectOrderEnabled/useEffectOrderEnabled";
import { useTranslation } from "@/i18n/useTranslation";
import "@/screens/matchTimerSettings.css";

export function EffectOrderSettings() {
  const { t } = useTranslation();
  const id = useId();
  const enabled = useEffectOrderEnabled();
  return (
    <div className="lobby-timer-settings" data-testid="effect-order-settings">
      <div className="lobby-timer-settings__header">
        <span id={`${id}-label`} className="lobby-timer-settings__label">
          {t("effectOrder.option")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-hint`}
          className="lobby-timer-switch"
          onClick={() => setEffectOrderEnabled(!enabled)}
        >
          <span />
        </button>
      </div>
      <p id={`${id}-hint`} className="lobby-timer-settings__hint">
        {t("effectOrder.optionHint")}
      </p>
    </div>
  );
}
