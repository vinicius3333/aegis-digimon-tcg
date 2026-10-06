/* Music and sound effect controls for the match dialog. The Settings screen keeps
   its own audio controls, so these live here instead of in the shared look settings. */

import { useId, useState } from "react";
import {
  getMusicVolume,
  getSoundVolume,
  isMusicEnabled,
  isSoundEnabled,
  playSound,
  setMusicEnabled,
  setMusicVolume,
  setSoundEnabled,
  setSoundVolume,
  unlockAudio,
} from "../../../design/sound";
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
  const toggleId = useId();
  const sliderId = useId();
  return (
    <div className="game-arena-audio__channel" data-disabled={!enabled || undefined}>
      <label className="game-arena-audio__toggle" htmlFor={toggleId}>
        <input
          id={toggleId}
          name={`${name}Enabled`}
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span>{label}</span>
      </label>
      <div className="game-arena-audio__volume">
        <label htmlFor={sliderId}>{volumeLabel}</label>
        <output htmlFor={sliderId} className="game-arena-audio__value">
          {volume}%
        </output>
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
      </div>
    </div>
  );
}

export function ArenaAudioSettings() {
  const { t } = useTranslation();
  const titleId = useId();
  const [musicOn, setMusicOn] = useState(isMusicEnabled);
  const [musicVolume, setMusicVolumeChoice] = useState(() => toPercent(getMusicVolume()));
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [soundVolume, setSoundVolumeChoice] = useState(() => toPercent(getSoundVolume()));
  return (
    <section className="game-arena-audio" aria-labelledby={titleId}>
      <h3 id={titleId} className="game-arena-audio__title">
        {t("redesign.arena.audio.title")}
      </h3>
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
    </section>
  );
}
