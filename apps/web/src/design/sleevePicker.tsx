import { useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "../i18n";
import { toStorableDataUrl } from "./battlefield";
import { Icons } from "./icons";
import { playSound } from "./sound";
import {
  CARD_SLEEVES,
  DEFAULT_CARD_SLEEVE,
  DEFAULT_EGG_SLEEVE,
  getCardSleeveId,
  getEggSleeveId,
  setCardSleeveId,
  setEggSleeveId,
  subscribeCardSleeve,
  CUSTOM_CARD_SLEEVE_ID,
  getCustomCardSleeveSrc,
  setCustomCardSleeve,
  clearCustomCardSleeve,
  type CardSleeve,
} from "./sleeve";

function SleeveGrid({
  sleeves,
  selectedId,
  onSelect,
}: {
  sleeves: readonly CardSleeve[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="settings-sleeve-grid">
      {sleeves.map((sleeve) => {
        const selected = sleeve.id === selectedId;
        return (
          <button
            className="settings-sleeve-option"
            key={sleeve.id}
            type="button"
            aria-label={`${sleeve.label}, ${sleeve.collection}`}
            aria-pressed={selected}
            onClick={() => {
              onSelect(sleeve.id);
              playSound("select");
            }}
          >
            <span className="settings-sleeve-preview">
              {sleeve.src ? (
                <img src={sleeve.src} alt="" />
              ) : (
                <span className="settings-sleeve-classic" aria-hidden="true" />
              )}
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

/**
 * The Digi-Egg deck's sleeve. It offers the main catalog and the image uploaded in
 * the card sleeve picker, after the standard white Digi-Egg back.
 */
export function EggSleevePicker() {
  const { t } = useTranslation();
  const selectedId = useSyncExternalStore(subscribeCardSleeve, getEggSleeveId, () => DEFAULT_EGG_SLEEVE.id);
  const customSrc = useSyncExternalStore(subscribeCardSleeve, getCustomCardSleeveSrc, () => undefined);
  const custom: CardSleeve[] = customSrc
    ? [
        {
          id: CUSTOM_CARD_SLEEVE_ID,
          label: t("settings.sleeveCustom"),
          collection: t("settings.sleeveLocal"),
          src: customSrc,
        },
      ]
    : [];
  return (
    <SleeveGrid
      sleeves={[DEFAULT_EGG_SLEEVE, ...custom, ...CARD_SLEEVES]}
      selectedId={selectedId}
      onSelect={setEggSleeveId}
    />
  );
}

export function CardSleevePicker() {
  const selectedId = useSyncExternalStore(subscribeCardSleeve, getCardSleeveId, () => DEFAULT_CARD_SLEEVE.id);

  const { t } = useTranslation();
  const customSrc = useSyncExternalStore(subscribeCardSleeve, getCustomCardSleeveSrc, () => undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const sleeves = customSrc
    ? [
        {
          id: CUSTOM_CARD_SLEEVE_ID,
          label: t("settings.sleeveCustom"),
          collection: t("settings.sleeveLocal"),
          src: customSrc,
        },
        ...CARD_SLEEVES,
      ]
    : CARD_SLEEVES;

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setUploadError(undefined);
    if (!file.type.startsWith("image/")) {
      setUploadError(t("settings.sleeveInvalid"));
      return;
    }
    setUploading(true);
    try {
      setCustomCardSleeve(await toStorableDataUrl(file));
      playSound("select");
    } catch {
      setUploadError(t("settings.sleeveUploadError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="settings-sleeve-actions">
        <button
          type="button"
          className="settings-sleeve-option"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Icons.Upload size={16} aria-hidden="true" />
          {uploading
            ? t("settings.sleeveUploading")
            : customSrc
              ? t("settings.sleeveReplace")
              : t("settings.sleeveUpload")}
        </button>
        {customSrc ? (
          <button
            type="button"
            className="settings-sleeve-option"
            disabled={uploading}
            onClick={() => {
              clearCustomCardSleeve();
              setUploadError(undefined);
            }}
          >
            {t("settings.sleeveRemove")}
          </button>
        ) : null}
      </div>
      <p className="settings-sleeve-hint">{t("settings.sleeveHint")}</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        aria-label={t("settings.sleeveUpload")}
        onChange={(event) => {
          void pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {uploadError ? <p role="status">{uploadError}</p> : null}
      <SleeveGrid sleeves={sleeves} selectedId={selectedId} onSelect={setCardSleeveId} />
    </div>
  );
}
