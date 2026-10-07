/* The deck's own sleeves: a footer row that names the main-deck and Digi-Egg sleeves,
   and a dialog with one tab per deck part. A pick applies at once, like every other
   deck edit. "Use the Settings sleeve" clears the deck's own choice, so a later change
   in Settings still reaches it. */

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Button, Dialog, IconButton } from "../design/primitives";
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
import { useTranslation, type Translate, type TranslationKey } from "../i18n";
import "./deckSleevePicker.css";

export type SleevePart = "main" | "egg";

export const SLEEVE_PARTS: readonly SleevePart[] = ["main", "egg"];

interface PartConfig {
  tab: TranslationKey;
  caption: TranslationKey;
  getGlobalId: () => string;
  defaultId: string;
  byId: (id: string) => CardSleeve;
  /** The part's own default back, pinned before the catalog when it is not in it. */
  pinnedDefault?: CardSleeve;
}

const PARTS: Record<SleevePart, PartConfig> = {
  main: {
    tab: "redesign.decks.editor.sleeveTabMain",
    caption: "redesign.decks.editor.sleeve",
    getGlobalId: getCardSleeveId,
    defaultId: DEFAULT_CARD_SLEEVE.id,
    byId: cardSleeveById,
  },
  egg: {
    tab: "redesign.decks.editor.sleeveTabEgg",
    caption: "redesign.decks.editor.sleeveTabEgg",
    getGlobalId: getEggSleeveId,
    defaultId: DEFAULT_EGG_SLEEVE.id,
    byId: eggSleeveById,
    pinnedDefault: DEFAULT_EGG_SLEEVE,
  },
};

/** A tile's value: a sleeve id, or undefined for "use the Settings sleeve". */
export interface SleeveTile {
  value: string | undefined;
  name: string;
  caption?: string;
  src?: string;
  /** The catalog collection, which tells apart sleeves that share a name. */
  collection?: string;
}

/** The tiles pinned above the catalog, in order: Settings sleeve, uploaded image, the part's default back. */
export function pinnedSleeveTiles(part: SleevePart, t: Translate, customSrc: string | undefined): SleeveTile[] {
  const config = PARTS[part];
  const globalSleeve = config.byId(config.getGlobalId());
  return [
    {
      value: undefined,
      name: t("redesign.decks.editor.sleeveUseSettings"),
      caption: sleeveName(globalSleeve, t),
      src: globalSleeve.src,
    },
    ...(customSrc
      ? [
          {
            value: CUSTOM_CARD_SLEEVE_ID,
            name: t("settings.sleeveCustom"),
            caption: t("settings.sleeveLocal"),
            src: customSrc,
          },
        ]
      : []),
    ...(config.pinnedDefault
      ? [
          {
            value: config.pinnedDefault.id,
            name: config.pinnedDefault.label,
            caption: t("redesign.decks.editor.sleeveStandardBack"),
            src: config.pinnedDefault.src,
          },
        ]
      : []),
  ];
}

function sleeveName(sleeve: CardSleeve, t: Translate): string {
  return sleeve.id === CUSTOM_CARD_SLEEVE_ID ? t("settings.sleeveCustom") : sleeve.label;
}

function useSleeveStores() {
  const mainGlobal = useSyncExternalStore(subscribeCardSleeve, getCardSleeveId, () => DEFAULT_CARD_SLEEVE.id);
  const eggGlobal = useSyncExternalStore(subscribeCardSleeve, getEggSleeveId, () => DEFAULT_EGG_SLEEVE.id);
  const customSrc = useSyncExternalStore(subscribeCardSleeve, getCustomCardSleeveSrc, () => undefined);
  return { globalIds: { main: mainGlobal, egg: eggGlobal } as Record<SleevePart, string>, customSrc };
}

/** The sleeve a deck part shows: its own choice when this device can show it, else the Settings one. */
function shownSleeve(part: SleevePart, own: string | undefined, globalId: string, customSrc: string | undefined) {
  const usable = own !== undefined && (own !== CUSTOM_CARD_SLEEVE_ID || Boolean(customSrc));
  return { sleeve: PARTS[part].byId(usable ? own : globalId), fromSettings: !usable };
}

function SleeveThumb({ src }: { src?: string }) {
  return (
    <span className="deck-sleeve-thumb" aria-hidden="true">
      {src ? <img src={src} alt="" /> : <span className="deck-sleeve-thumb__classic" />}
    </span>
  );
}

export function DeckSleevePicker({
  sleeveIds,
  onChange,
}: {
  sleeveIds: Record<SleevePart, string | undefined>;
  onChange: (part: SleevePart, sleeveId: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const { globalIds, customSrc } = useSleeveStores();
  const [open, setOpen] = useState(false);

  return (
    <div className="deck-sleeves">
      <ul className="deck-sleeves__list">
        {SLEEVE_PARTS.map((part) => {
          const { sleeve, fromSettings } = shownSleeve(part, sleeveIds[part], globalIds[part], customSrc);
          return (
            <li key={part} className="deck-sleeves__item" data-testid={`deck-sleeve-${part}`}>
              <SleeveThumb src={sleeve.src} />
              <span className="deck-sleeves__copy">
                <span className="deck-sleeves__caption">{t(PARTS[part].caption)}</span>
                <span className="deck-sleeves__name" title={sleeveName(sleeve, t)}>
                  {sleeveName(sleeve, t)}
                </span>
                {fromSettings ? (
                  <span className="deck-sleeves__source">{t("redesign.decks.editor.sleeveFromSettings")}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        className="deck-sleeves__change"
        aria-haspopup="dialog"
        aria-label={t("redesign.decks.editor.sleeveChangeLabel")}
        onClick={() => setOpen(true)}
      >
        {t("redesign.decks.editor.sleeveChange")}
        <Icons.ArrowRight size={14} />
      </Button>
      {open ? (
        <DeckSleeveDialog
          sleeveIds={sleeveIds}
          globalIds={globalIds}
          customSrc={customSrc}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function DeckSleeveDialog({
  sleeveIds,
  globalIds,
  customSrc,
  onChange,
  onClose,
}: {
  sleeveIds: Record<SleevePart, string | undefined>;
  globalIds: Record<SleevePart, string>;
  customSrc: string | undefined;
  onChange: (part: SleevePart, sleeveId: string | undefined) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [part, setPart] = useState<SleevePart>("main");
  const tabRefs = useRef<Partial<Record<SleevePart, HTMLButtonElement | null>>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [part]);
  const selected = sleeveIds[part];
  const shown = shownSleeve(part, selected, globalIds[part], customSrc);
  const pinned = pinnedSleeveTiles(part, t, customSrc);
  const pinnedValues = new Set(pinned.map((tile) => tile.value));

  const selectTab = (next: SleevePart) => {
    setPart(next);
    tabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = SLEEVE_PARTS.indexOf(part);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (event.key === "Home") selectTab(SLEEVE_PARTS[0]!);
    else if (event.key === "End") selectTab(SLEEVE_PARTS.at(-1)!);
    else if (step !== 0) selectTab(SLEEVE_PARTS[(index + step + SLEEVE_PARTS.length) % SLEEVE_PARTS.length]!);
    else return;
    event.preventDefault();
  };

  const isSelected = (value: string | undefined) =>
    value === undefined ? shown.fromSettings : !shown.fromSettings && value === selected;

  const tile = (entry: SleeveTile) => {
    const on = isSelected(entry.value);
    return (
      <li key={entry.value ?? "settings"}>
        <button
          type="button"
          className="deck-sleeve-tile"
          aria-pressed={on}
          aria-label={entry.collection ? `${entry.name}, ${entry.collection}` : undefined}
          onClick={() => onChange(part, entry.value)}
        >
          <span className="deck-sleeve-tile__preview">
            {entry.src ? (
              <img src={entry.src} alt="" loading="lazy" />
            ) : (
              <span className="deck-sleeve-thumb__classic" />
            )}
            {entry.value === undefined ? (
              <span className="deck-sleeve-tile__badge" aria-hidden="true">
                <Icons.Settings size={14} />
              </span>
            ) : null}
            {on ? (
              <span className="deck-sleeve-tile__check" aria-hidden="true">
                <Icons.Check size={14} />
              </span>
            ) : null}
          </span>
          <span className="deck-sleeve-tile__name">{entry.name}</span>
          {entry.caption ? <span className="deck-sleeve-tile__caption">{entry.caption}</span> : null}
        </button>
      </li>
    );
  };

  return (
    <Dialog className="deck-sleeve-dialog" labelledBy="deck-sleeve-dialog-title" onClose={onClose}>
      <header className="deck-sleeve-dialog__header">
        <h2 id="deck-sleeve-dialog-title" className="deck-sleeve-dialog__title">
          {t("redesign.decks.editor.sleevesTitle")}
        </h2>
        <IconButton variant="ghost" size="sm" label={t("common.close")} onClick={onClose}>
          <Icons.X size={18} />
        </IconButton>
      </header>
      <div
        className="deck-sleeve-dialog__tabs"
        role="tablist"
        aria-label={t("redesign.decks.editor.sleevesTitle")}
        onKeyDown={onTabKeyDown}
      >
        {SLEEVE_PARTS.map((option) => (
          <button
            key={option}
            ref={(element) => {
              tabRefs.current[option] = element;
            }}
            type="button"
            role="tab"
            id={`deck-sleeve-tab-${option}`}
            aria-selected={part === option}
            aria-controls="deck-sleeve-panel"
            tabIndex={part === option ? 0 : -1}
            className="deck-sleeve-dialog__tab"
            onClick={() => setPart(option)}
          >
            {t(PARTS[option].tab)}
          </button>
        ))}
      </div>
      <div
        ref={panelRef}
        className="deck-sleeve-dialog__panel"
        role="tabpanel"
        id="deck-sleeve-panel"
        aria-labelledby={`deck-sleeve-tab-${part}`}
      >
        <ul className="deck-sleeve-dialog__grid">
          {pinned.map(tile)}
          {CARD_SLEEVES.filter((sleeve) => !pinnedValues.has(sleeve.id)).map((sleeve) =>
            tile({
              value: sleeve.id,
              name: sleeve.label,
              caption: sleeve.collection,
              src: sleeve.src,
              collection: sleeve.collection,
            }),
          )}
        </ul>
      </div>
      <footer className="deck-sleeve-dialog__footer">
        <p className="deck-sleeve-dialog__current">
          {t("redesign.decks.editor.sleeveCurrent", { part: t(PARTS[part].tab), sleeve: sleeveName(shown.sleeve, t) })}
        </p>
        <Button size="sm" onClick={onClose}>
          {t("common.done")}
        </Button>
      </footer>
    </Dialog>
  );
}
