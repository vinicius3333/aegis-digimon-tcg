import { useEffect, useRef } from "react";
import { playSound, startMusic, stopMusic } from "../design/sound";
import { EFFECT_SPEED_SCALE, getEffectSpeed } from "./pacing";
import type { MatchCues } from "./match/types";
import {
  soundsForPresentation,
  takeNewPresentationSounds,
  securityOutcomeSound,
  type PresentationAudioBoard,
} from "./match/present/presentationAudio";
import { soundsForReadouts, type AudioReadouts } from "./match/present/readoutAudio";

export function usePresentationAudio(cues: MatchCues, board?: PresentationAudioBoard): void {
  const seen = useRef(new Set<string>());
  const outcome = securityOutcomeSound(cues.securityClash);
  const outcomeId = outcome?.id;
  const outcomeKind = outcome?.kind;
  const outcomeDelay = outcome?.delayMs;
  useEffect(() => {
    if (!outcomeId || !outcomeKind || outcomeDelay === undefined || seen.current.has(outcomeId)) return;
    const timer = setTimeout(() => {
      if (seen.current.has(outcomeId)) return;
      seen.current.add(outcomeId);
      if (!document.hidden) playSound(outcomeKind);
    }, outcomeDelay * EFFECT_SPEED_SCALE[getEffectSpeed()]);
    return () => clearTimeout(timer);
  }, [outcomeId, outcomeKind, outcomeDelay]);
  useEffect(() => {
    startMusic();
    return stopMusic;
  }, []);
  useEffect(() => {
    const fresh = takeNewPresentationSounds(soundsForPresentation(cues, board), seen.current);
    if (document.hidden) return;
    // Passive effects run after React commits the presentation, never from early server receipts.
    for (const sound of fresh) playSound(sound.kind, sound.details);
  }, [cues, board]);
}

/** Sounds the gauge, the viewer's prompt, and the viewer's last seconds as the screen paints them. */
export function useReadoutAudio({ memory, promptKey, timerSeconds }: AudioReadouts): void {
  const previous = useRef<AudioReadouts | undefined>(undefined);
  useEffect(() => {
    const current = { memory, promptKey, timerSeconds };
    const sounds = soundsForReadouts(previous.current, current);
    previous.current = current;
    if (document.hidden) return;
    for (const sound of sounds) playSound(sound.kind, sound.details);
  }, [memory, promptKey, timerSeconds]);
}
