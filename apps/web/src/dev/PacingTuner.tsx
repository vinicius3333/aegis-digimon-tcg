import { useEffect, useState } from "react";
import {
  DEFAULT_PACING,
  EFFECT_SPEED_SCALE,
  EFFECT_SPEEDS,
  getEffectSpeed,
  setBasePacing,
  setEffectSpeed,
  type EffectSpeed,
} from "../game/pacing";

/** The lab uses the same stacked timing as a match, without saved timing overrides. */
export function useLabPacing(): void {
  useEffect(() => {
    setBasePacing(DEFAULT_PACING);
    return () => setBasePacing(DEFAULT_PACING);
  }, []);
}

export function PacingTuner({ portuguese }: { portuguese: boolean }) {
  const [speed, setSpeed] = useState<EffectSpeed>(getEffectSpeed);

  function changeSpeed(next: EffectSpeed) {
    setEffectSpeed(next);
    setSpeed(next);
  }

  return (
    <section className="aegis-effects-lab-section">
      <h2>{portuguese ? "Velocidade dos efeitos" : "Effect speed"}</h2>
      <label className="aegis-effects-lab-field">
        <span>{portuguese ? "Velocidade dos efeitos" : "Effect speed"}</span>
        <select value={speed} onChange={(event) => changeSpeed(event.target.value as EffectSpeed)}>
          {EFFECT_SPEEDS.map((value) => (
            <option key={value} value={value}>
              {value} ×{EFFECT_SPEED_SCALE[value]}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
