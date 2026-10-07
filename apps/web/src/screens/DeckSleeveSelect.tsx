/* The deck's own card sleeve, for the main deck or the Digi-Egg deck. "Use the
   Settings sleeve" keeps the deck on the global choice, so a change in Settings
   still reaches every deck without its own sleeve. */

import { useSyncExternalStore } from "react";
import { Icons } from "../design/icons";
import {
  CARD_SLEEVES,
  CUSTOM_CARD_SLEEVE_ID,
  DEFAULT_CARD_SLEEVE,
  DEFAULT_EGG_SLEEVE,
  cardSleeveById,
  eggSleeveById,
  getCardSleeveId,
  getCustomCardSleeveSrc,
  getEggSleeveId,
  subscribeCardSleeve,
  type CardSleeve,
} from "../design/sleeve";
import { useTranslation, type TranslationKey } from "../i18n";

export type SleeveKind = "main" | "egg";

function groupByCollection(sleeves: readonly CardSleeve[]) {
  return sleeves.reduce((groups, sleeve) => {
    groups.set(sleeve.collection, [...(groups.get(sleeve.collection) ?? []), sleeve]);
    return groups;
  }, new Map<string, CardSleeve[]>());
}

const SLEEVE_KINDS: Record<
  SleeveKind,
  {
    label: TranslationKey;
    globalLabel: TranslationKey;
    getGlobalId: () => string;
    defaultId: string;
    byId: (id: string) => CardSleeve;
    groups: Map<string, CardSleeve[]>;
  }
> = {
  main: {
    label: "redesign.decks.editor.sleeve",
    globalLabel: "redesign.decks.editor.sleeveGlobal",
    getGlobalId: getCardSleeveId,
    defaultId: DEFAULT_CARD_SLEEVE.id,
    byId: cardSleeveById,
    groups: groupByCollection(CARD_SLEEVES),
  },
  egg: {
    label: "redesign.decks.editor.eggSleeve",
    globalLabel: "redesign.decks.editor.sleeveGlobal",
    getGlobalId: getEggSleeveId,
    defaultId: DEFAULT_EGG_SLEEVE.id,
    byId: eggSleeveById,
    groups: groupByCollection([DEFAULT_EGG_SLEEVE, ...CARD_SLEEVES]),
  },
};

const USE_GLOBAL = "";

export function DeckSleeveSelect({
  kind = "main",
  sleeveId,
  onChange,
}: {
  kind?: SleeveKind;
  sleeveId: string | undefined;
  onChange: (sleeveId: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const config = SLEEVE_KINDS[kind];
  const globalId = useSyncExternalStore(subscribeCardSleeve, config.getGlobalId, () => config.defaultId);
  const customSrc = useSyncExternalStore(subscribeCardSleeve, getCustomCardSleeveSrc, () => undefined);
  const showsOwnSleeve = sleeveId !== undefined && (sleeveId !== CUSTOM_CARD_SLEEVE_ID || Boolean(customSrc));
  const shown = config.byId(showsOwnSleeve ? sleeveId : globalId);
  const sleeveLabel = (sleeve: CardSleeve) =>
    sleeve.id === CUSTOM_CARD_SLEEVE_ID ? t("settings.sleeveCustom") : sleeve.label;

  return (
    <div className="deck-sleeve">
      <span className="deck-sleeve__preview" aria-hidden="true">
        {shown.src ? <img src={shown.src} alt="" /> : <span className="deck-sleeve__classic" />}
      </span>
      <label className="deck-sleeve__field">
        <span className="aegis-hero-panel__eyebrow">{t(config.label)}</span>
        <span className="deck-sleeve__select">
          <select
            value={sleeveId ?? USE_GLOBAL}
            onChange={(event) => onChange(event.target.value === USE_GLOBAL ? undefined : event.target.value)}
          >
            <option value={USE_GLOBAL}>{t(config.globalLabel, { sleeve: sleeveLabel(config.byId(globalId)) })}</option>
            {customSrc || sleeveId === CUSTOM_CARD_SLEEVE_ID ? (
              <option value={CUSTOM_CARD_SLEEVE_ID}>{t("settings.sleeveCustom")}</option>
            ) : null}
            {[...config.groups].map(([collection, sleeves]) => (
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
