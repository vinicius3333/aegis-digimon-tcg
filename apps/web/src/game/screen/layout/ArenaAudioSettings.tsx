/* Music and sound effect controls for the match dialog. The Settings screen keeps
   its own audio controls, so these live here instead of in the shared look settings.
   Each channel is one row: its switch, then its volume slider and level, with the
   soundtrack picker on a row of its own under the music. */

import { useId, useState } from "react";
import {
  getMusicTrack,
  getMusicVolume,
  getSoundVolume,
  isMusicEnabled,
  isSoundEnabled,
  playSound,
  setMusicEnabled,
  setMusicTrack,
  setMusicVolume,
  setSoundEnabled,
  setSoundVolume,
  unlockAudio,
} from "../../../design/sound";
import { isMusicTrack, MUSIC_TRACK_LABEL_KEYS, MUSIC_TRACKS } from "../../../design/musicTracks";
import { Switch } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";

const toPercent = (volume: number) => Math.round(volume * 100);
const SLIDER_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

function AudioChannel({
  name,
  label,
  volumeLabel,
  enabled,
  volume,
  onToggle,
  onVolume,
  onVolumeSettled,
}: {
  name: string;
  label: string;
  volumeLabel: string;
  enabled: boolean;
  volume: number;
  onToggle: (enabled: boolean) => void;
  onVolume: (volume: number) => void;
  onVolumeSettled?: () => void;
}) {
  const sliderId = useId();
  return (
    <div className="game-arena-settings__row game-arena-audio__row" data-disabled={!enabled || undefined}>
      <Switch checked={enabled} label={label} onChange={onToggle} />
      <div className="game-arena-audio__volume">
        <label htmlFor={sliderId} className="aegis-sr-only">
          {volumeLabel}
        </label>
        <input
          id={sliderId}
          name={`${name}Volume`}
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          aria-valuetext={`${volume}%`}
          disabled={!enabled}
          onChange={(event) => onVolume(Number(event.target.value))}
          onPointerUp={onVolumeSettled}
          onKeyUp={(event) => SLIDER_KEYS.has(event.key) && onVolumeSettled?.()}
        />
        <output htmlFor={sliderId} className="game-arena-audio__value">
          {volume}%
        </output>
      </div>
    </div>
  );
}

export function ArenaAudioSettings() {
  const { t } = useTranslation();
  const titleId = useId();
  const [musicOn, setMusicOn] = useState(isMusicEnabled);
  const [musicVolume, setMusicVolumeChoice] = useState(() => toPercent(getMusicVolume()));
  const [musicTrack, setMusicTrackChoice] = useState(getMusicTrack);
  const trackId = useId();
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [soundVolume, setSoundVolumeChoice] = useState(() => toPercent(getSoundVolume()));
  return (
    <section className="game-arena-audio" aria-labelledby={titleId}>
      <h3 id={titleId} className="game-arena-settings__title">
        {t("redesign.arena.audio.title")}
      </h3>
      <div className="game-arena-settings__panel">
        <AudioChannel
          name="music"
          label={t("redesign.arena.audio.music")}
          volumeLabel={t("redesign.arena.audio.musicVolume")}
          enabled={musicOn}
          volume={musicVolume}
          onToggle={(next) => {
            unlockAudio();
            setMusicEnabled(next);
            setMusicOn(next);
          }}
          onVolume={(next) => {
            setMusicVolumeChoice(next);
            setMusicVolume(next / 100);
          }}
        />
        <div className="game-arena-settings__row game-arena-audio__row">
          <label htmlFor={trackId} className="game-arena-audio__track-label">
            {t("redesign.arena.audio.musicTrack")}
          </label>
          <select
            id={trackId}
            name="musicTrack"
            className="game-arena-audio__track"
            value={musicTrack}
            onChange={(event) => {
              const next = event.target.value;
              if (!isMusicTrack(next)) return;
              setMusicTrack(next);
              setMusicTrackChoice(next);
            }}
          >
            {MUSIC_TRACKS.map((track) => (
              <option key={track} value={track}>
                {t(MUSIC_TRACK_LABEL_KEYS[track])}
              </option>
            ))}
          </select>
        </div>
        <AudioChannel
          name="sound"
          label={t("redesign.arena.audio.effects")}
          volumeLabel={t("redesign.arena.audio.effectsVolume")}
          enabled={soundOn}
          volume={soundVolume}
          onToggle={(next) => {
            unlockAudio();
            setSoundEnabled(next);
            setSoundOn(next);
            if (next) playSound("confirm");
          }}
          onVolume={(next) => {
            setSoundVolumeChoice(next);
            setSoundVolume(next / 100);
          }}
          onVolumeSettled={() => soundOn && playSound("select")}
        />
      </div>
    </section>
  );
}
