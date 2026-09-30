import { useEffect, useState } from "react";
import {
  DEFAULT_PACING,
  EFFECT_SPEED_SCALE,
  EFFECT_SPEEDS,
  getEffectSpeed,
  setBasePacing,
  setEffectSpeed,
  type EffectSpeed,
  type PacingConfig,
  type PacingKnob,
} from "../game/pacing";
import {
  KNOB_SPECS,
  loadTunedPacing,
  PACING_KNOBS,
  PACING_PRESET_LABELS,
  PACING_PRESETS,
  pacingAsTypeScript,
  saveTunedPacing,
  withKnob,
  type PacingPreset,
} from "./pacingTunerModel";

const PRESETS = Object.keys(PACING_PRESETS) as PacingPreset[];

/**
 * Live sequential pacing knobs. Every change applies to the next effect the match plays; the
 * tuned config is remembered in this browser and dropped when the lab closes, so a real match
 * always plays the shipped defaults.
 */
export function PacingTuner({ portuguese }: { portuguese: boolean }) {
  const [config, setConfig] = useState<PacingConfig>(loadTunedPacing);
  const [speed, setSpeed] = useState<EffectSpeed>(getEffectSpeed);
  const [copyStatus, setCopyStatus] = useState<string>();

  useEffect(() => setBasePacing(config), [config]);
  useEffect(() => () => setBasePacing(DEFAULT_PACING), []);

  function apply(next: PacingConfig) {
    setConfig(next);
    saveTunedPacing(next);
    setCopyStatus(undefined);
  }

  function changeKnob(knob: PacingKnob, value: number) {
    apply(withKnob(config, knob, value));
  }

  function changeSpeed(next: EffectSpeed) {
    setEffectSpeed(next);
    setSpeed(next);
  }

  async function copyLiteral() {
    try {
      await navigator.clipboard.writeText(pacingAsTypeScript(config));
      setCopyStatus(portuguese ? "Copiado" : "Copied");
    } catch {
      setCopyStatus(portuguese ? "Falha ao copiar" : "Copy failed");
    }
  }

  const perEffectMs = config.sourceHoldMs + config.announceMs + config.settleMs;
  const perMinorMs = config.sourceHoldMs + config.minorAnnounceMs + config.minorSettleMs;
  const scale = EFFECT_SPEED_SCALE[speed];

  return (
    <section className="aegis-effects-lab-section">
      <h2>{portuguese ? "Ajuste de ritmo" : "Pacing tuner"}</h2>
      <div className="aegis-effects-lab-controls">
        {PRESETS.map((preset) => (
          <button key={preset} type="button" onClick={() => apply(PACING_PRESETS[preset])}>
            {PACING_PRESET_LABELS[preset]}
          </button>
        ))}
        <button type="button" onClick={() => apply(DEFAULT_PACING)}>
          {portuguese ? "Restaurar padrão" : "Reset to defaults"}
        </button>
        <button type="button" onClick={() => void copyLiteral()}>
          {portuguese ? "Copiar como TS" : "Copy as TS"}
        </button>
        {copyStatus ? <span className="aegis-effects-lab-muted">{copyStatus}</span> : null}
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
      </div>
      <p className="aegis-effects-lab-muted">
        {portuguese ? "Por efeito, sem resultados" : "Per effect, before results"}: {Math.round(perEffectMs * scale)} ms
        · {portuguese ? "menor" : "minor"} {Math.round(perMinorMs * scale)} ms
      </p>
      <div className="aegis-effects-lab-knobs">
        {PACING_KNOBS.map((knob) => {
          const spec = KNOB_SPECS[knob];
          return (
            <label key={knob} className="aegis-effects-lab-knob" title={spec.doc}>
              <span>
                {spec.label} <span className="aegis-effects-lab-muted">({spec.unit})</span>
              </span>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={config[knob]}
                aria-label={spec.label}
                onChange={(event) => changeKnob(knob, Number(event.target.value))}
              />
              <input
                type="number"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={config[knob]}
                aria-label={`${spec.label} (${spec.unit})`}
                onChange={(event) => changeKnob(knob, event.target.valueAsNumber)}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}
