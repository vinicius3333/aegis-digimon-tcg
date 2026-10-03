import { MATCH_TIMER_START_OPTIONS, MATCH_TIMER_REFILL_OPTIONS, type MatchTimerOptions } from "@aegis/shared";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";

export function MatchTimerSettings({
  options,
  onChange,
  privateRoom,
}: {
  options: Required<MatchTimerOptions>;
  onChange: (options: Required<MatchTimerOptions>) => void;
  privateRoom: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="lobby-timer-settings">
      <span id="match-timer-label" className="lobby-timer-settings__label">
        <Icons.Clock size={16} />
        {t("lobby.timer.label")}
      </span>
      <div role="group" aria-labelledby="match-timer-label" className="lobby-timer-options">
        {[true, false].map((enabled) => (
          <button
            type="button"
            key={String(enabled)}
            aria-pressed={options.matchTimer === enabled}
            className={options.matchTimer === enabled ? "is-selected" : undefined}
            onClick={() => onChange({ ...options, matchTimer: enabled })}
          >
            {t(enabled ? "lobby.timer.with" : "lobby.timer.without")}
          </button>
        ))}
      </div>
      {options.matchTimer && privateRoom ? (
        <div className="lobby-timer-fields">
          <label>
            {t("lobby.timer.start")}
            <select
              value={options.timerStartSeconds}
              onChange={(event) => onChange({ ...options, timerStartSeconds: Number(event.target.value) })}
            >
              {MATCH_TIMER_START_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {t("lobby.timer.seconds", { seconds })}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("lobby.timer.refill")}
            <select
              value={options.timerRefillSeconds}
              onChange={(event) => onChange({ ...options, timerRefillSeconds: Number(event.target.value) })}
            >
              {MATCH_TIMER_REFILL_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  +{t("lobby.timer.seconds", { seconds })}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : options.matchTimer ? (
        <span className="lobby-timer-summary">{t("lobby.timer.summary", { minutes: 5, seconds: 30 })}</span>
      ) : null}
      <p className="lobby-timer-hint">{t(privateRoom ? "lobby.timer.privateHint" : "lobby.timer.publicHint")}</p>
    </div>
  );
}
