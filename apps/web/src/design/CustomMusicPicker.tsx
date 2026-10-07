import { useId, useState } from "react";
import "./CustomMusicPicker.css";
import { useTranslation } from "../i18n";
import { clearCustomMusic, setCustomMusicFile, unlockAudio, useCustomMusicName } from "./sound";

export function CustomMusicPicker() {
  const { t } = useTranslation();
  const id = useId();
  const name = useCustomMusicName();
  const [error, setError] = useState(false);
  return (
    <div className="custom-music-picker">
      <div className="custom-music-picker__copy">
        <label htmlFor={id}>{t("settings.customMusic")}</label>
        <small id={`${id}-help`}>{t("settings.customMusicDesc")}</small>
      </div>
      <input
        id={id}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
        aria-describedby={`${id}-help`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            unlockAudio();
            setError(!setCustomMusicFile(file));
          }
          event.target.value = "";
        }}
      />
      {name ? (
        <div className="custom-music-picker__active">
          <output className="custom-music-picker__name">{name}</output>
          <button className="custom-music-picker__reset" type="button" onClick={clearCustomMusic}>
            {t("settings.customMusicClear")}
          </button>
        </div>
      ) : null}
      {error ? <p role="alert">{t("settings.customMusicError")}</p> : null}
    </div>
  );
}
