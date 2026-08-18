import { useSyncExternalStore } from "react";
import { playSound } from "./sound";
import {
  CARD_SLEEVES,
  DEFAULT_CARD_SLEEVE,
  getCardSleeveId,
  setCardSleeveId,
  subscribeCardSleeve,
} from "./sleeve";

export function CardSleevePicker() {
  const selectedId = useSyncExternalStore(subscribeCardSleeve, getCardSleeveId, () => DEFAULT_CARD_SLEEVE.id);

  return (
    <div className="settings-sleeve-grid">
      {CARD_SLEEVES.map((sleeve) => {
        const selected = sleeve.id === selectedId;
        return (
          <button
            className="settings-sleeve-option"
            key={sleeve.id}
            type="button"
            aria-label={`${sleeve.label} — ${sleeve.collection}`}
            aria-pressed={selected}
            onClick={() => {
              setCardSleeveId(sleeve.id);
              playSound("select");
            }}
          >
            <span className="settings-sleeve-preview">
              {sleeve.src ? <img src={sleeve.src} alt="" /> : <span className="settings-sleeve-classic" aria-hidden="true" />}
            </span>
            <span className="settings-sleeve-copy">
              <span>{sleeve.label}</span>
              <small>{sleeve.collection}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
