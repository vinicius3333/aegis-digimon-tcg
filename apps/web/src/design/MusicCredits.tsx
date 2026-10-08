import { useTranslation } from "../i18n";
import { MUSIC_TRACK_CREDITS, type MusicTrack } from "./musicTracks";
import { useCustomMusicName } from "./sound";
import "./MusicCredits.css";

export function MusicCredits({ track }: { track: MusicTrack }) {
  const { t } = useTranslation();
  const customName = useCustomMusicName();
  if (customName) return null;
  const credit = MUSIC_TRACK_CREDITS[track];
  return (
    <p className="music-credits">
      <a href={credit.sourceUrl} target="_blank" rel="noreferrer">
        {credit.title} — {credit.artist}
      </a>
      {" · "}
      <a href={credit.licenseUrl} target="_blank" rel="noreferrer">
        {credit.license}
      </a>
      {" · "}
      {t("settings.musicTrackEdits")}
    </p>
  );
}
