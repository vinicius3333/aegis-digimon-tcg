/* The deck's own card sleeve. "Use the Settings sleeve" keeps the deck on the global
   choice, so a change in Settings still reaches every deck without its own sleeve. */

import { useSyncExternalStore } from "react";
import { Icons } from "../design/icons";
import {
  CARD_SLEEVES,
  CUSTOM_CARD_SLEEVE_ID,
  DEFAULT_CARD_SLEEVE,
  cardSleeveById,
  getCardSleeveId,
  getCustomCardSleeveSrc,
  subscribeCardSleeve,
  type CardSleeve,
} from "../design/sleeve";
import { useTranslation } from "../i18n";

const SLEEVES_BY_COLLECTION = CARD_SLEEVES.reduce((groups, sleeve) => {
  groups.set(sleeve.collection, [...(groups.get(sleeve.collection) ?? []), sleeve]);
  return groups;
}, new Map<string, CardSleeve[]>());

const USE_GLOBAL = "";

export function DeckSleeveSelect({
  sleeveId,
  onChange,
}: {
  sleeveId: string | undefined;
  onChange: (sleeveId: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const globalId = useSyncExternalStore(subscribeCardSleeve, getCardSleeveId, () => DEFAULT_CARD_SLEEVE.id);
  const customSrc = useSyncExternalStore(subscribeCardSleeve, getCustomCardSleeveSrc, () => undefined);
  const showsOwnSleeve = sleeveId !== undefined && (sleeveId !== CUSTOM_CARD_SLEEVE_ID || Boolean(customSrc));
  const shown = cardSleeveById(showsOwnSleeve ? sleeveId : globalId);
  const sleeveLabel = (sleeve: CardSleeve) =>
    sleeve.id === CUSTOM_CARD_SLEEVE_ID ? t("settings.sleeveCustom") : sleeve.label;

  return (
    <div className="deck-sleeve">
      <span className="deck-sleeve__preview" aria-hidden="true">
        {shown.src ? <img src={shown.src} alt="" /> : <span className="deck-sleeve__classic" />}
      </span>
      <label className="deck-sleeve__field">
        <span className="aegis-hero-panel__eyebrow">{t("redesign.decks.editor.sleeve")}</span>
        <span className="deck-sleeve__select">
          <select
            value={sleeveId ?? USE_GLOBAL}
            onChange={(event) => onChange(event.target.value === USE_GLOBAL ? undefined : event.target.value)}
          >
            <option value={USE_GLOBAL}>
              {t("redesign.decks.editor.sleeveGlobal", { sleeve: sleeveLabel(cardSleeveById(globalId)) })}
            </option>
            {customSrc || sleeveId === CUSTOM_CARD_SLEEVE_ID ? (
              <option value={CUSTOM_CARD_SLEEVE_ID}>{t("settings.sleeveCustom")}</option>
            ) : null}
            {[...SLEEVES_BY_COLLECTION].map(([collection, sleeves]) => (
              <optgroup key={collection} label={collection}>
                {sleeves.map((sleeve) => (
                  <option key={sleeve.id} value={sleeve.id}>
                    {sleeve.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Icons.ChevronDown className="deck-sleeve__chevron" size={16} />
        </span>
      </label>
    </div>
  );
}
