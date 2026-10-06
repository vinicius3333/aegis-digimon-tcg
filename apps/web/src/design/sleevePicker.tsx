import { useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "../i18n";
import { toStorableDataUrl } from "./battlefield";
import { Icons } from "./icons";
import { playSound } from "./sound";
import {
  CARD_SLEEVES,
  DEFAULT_CARD_SLEEVE,
  getCardSleeveId,
  setCardSleeveId,
  subscribeCardSleeve,
  CUSTOM_CARD_SLEEVE_ID,
  getCustomCardSleeveSrc,
  setCustomCardSleeve,
  clearCustomCardSleeve,
} from "./sleeve";

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
                setCardSleeveId(sleeve.id);
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
    </div>
  );
}
