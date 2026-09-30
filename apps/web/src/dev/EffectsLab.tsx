import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { CATALOG_DECKS } from "@aegis/shared";
import { colorKey } from "../design/theme";
import { GameScreen } from "../game/GameScreen";
import type { AnimationStep } from "../game/animationQueue";
import type {
  PresentationControls,
  PresentationPacing,
  PresentationProbe,
  PresentationStepEvent,
} from "../game/presentationProbe";
import { loadIdentity } from "../identity";
import { useTranslation } from "../i18n";
import type { AegisJoinOptions } from "../net/types";
import { createDocumentPlayback } from "./documentPlayback";
import {
  activeSteps,
  barSpan,
  batchEventRows,
  effectsLabReducer,
  effectsLabTrace,
  emptyEffectsLab,
  stepBars,
  stepKeysOfBatch,
  stepTooltip,
  timelineBounds,
  trackLanes,
  type EffectsLabAction,
  type EffectsLabState,
  type LabStepEvent,
  type StepBar,
} from "./effectsLabModel";
import { SCENARIO_NOTES, type ScenarioCopy } from "./LiveArenaDemo";
import { PacingTuner } from "./PacingTuner";
import "./effectsLab.css";

type DevScenario = NonNullable<AegisJoinOptions["devScenario"]>;

const SCENARIO_OPTIONS: readonly (readonly [DevScenario, string])[] = [
  ["effects-lab-own-chain", "Effects lab · own trigger chain"],
  ["effects-lab-opponent-chain", "Effects lab · opponent trigger chain"],
  ["effects-lab-nested", "Effects lab · nested triggers"],
  ["effects-lab-prod-royal-knights", "Effects lab · production Royal Knights"],
  ["effects-lab-prod-ghost", "Effects lab · production Ghost"],
  ["arena-ex13-deletion-trigger-ordering", "EX13 Kings · deletion trigger ordering"],
  ["arena-gate-deadly-sins-effect-order", "EX6 Gate of Deadly Sins · effect resolution plan"],
  ["arena-security-effect-pacing", "Security effects · pacing"],
  ["arena-ex13-giromon-block-triggers", "EX13 Giromon · 6 block triggers"],
];

const LAB_NOTES: Partial<Record<DevScenario, ScenarioCopy>> = {
  "effects-lab-own-chain": {
    en: "Pass breeding, then digivolve Golemon into Megadramon. Six of your effects trigger at once: plan their order and watch each resolve.",
    ptBR: "Passe a criação e digievolua Golemon em Megadramon. Seis efeitos seus disparam juntos: planeje a ordem e acompanhe cada um.",
  },
  "effects-lab-opponent-chain": {
    en: "Pass breeding, then end your turn. The bot resolves five start-of-main effects with no prompt for you.",
    ptBR: "Passe a criação e encerre o turno. O bot resolve cinco efeitos de início da fase principal sem nenhuma escolha sua.",
  },
  "effects-lab-nested": {
    en: "Pass breeding, then attack the player with Gallantmon. Order its two effects; the deletion adds more triggers, then three security checks follow.",
    ptBR: "Passe a criação e ataque o jogador com Gallantmon. Ordene os dois efeitos; a deleção adiciona novos gatilhos e depois vêm três checagens de segurança.",
  },
  "effects-lab-prod-royal-knights": {
    en: "Production chain. Pass breeding, digivolve Zudomon into UlforceVeedramon (3× Cool Boy trigger), then attack the player to reveal BT20-100.",
    ptBR: "Cadeia de produção. Passe a criação, digievolua Zudomon em UlforceVeedramon (3× Cool Boy disparam) e ataque o jogador para revelar BT20-100.",
  },
  "effects-lab-prod-ghost": {
    en: "Production chain. Pass breeding, end your turn, accept the Execute attack and target the player. Decline both digivolve offers to follow the logged chain.",
    ptBR: "Cadeia de produção. Passe a criação, encerre o turno, aceite o ataque Execute e mire no jogador. Recuse as duas ofertas de digievolução para seguir a cadeia registrada.",
  },
};

const RATES = [0.25, 0.5, 1, 2, 4] as const;
const PACINGS: readonly PresentationPacing[] = ["current", "sequential"];
const ZOOMS = [0.05, 0.1, 0.2, 0.4] as const;

const LabGameScreen = memo(GameScreen);

function initialScenario(): DevScenario {
  const requested = new URLSearchParams(window.location.search).get("scenario");
  return SCENARIO_OPTIONS.find(([value]) => value === requested)?.[0] ?? "effects-lab-own-chain";
}

function labStepEvent(key: string, event: PresentationStepEvent): LabStepEvent {
  const { step } = event;
  return {
    key,
    stepId: step.id,
    track: step.track ?? "main",
    ...(step.side ? { side: step.side } : {}),
    phase: event.phase,
    mode: event.mode,
    cancelled: event.cancelled,
    skipping: event.skipping,
    failed: event.failed,
    ...(event.durationMs !== undefined ? { durationMs: event.durationMs } : {}),
    ...(event.batch ? { batchId: event.batch.batchId, stateVersion: event.batch.stateVersion } : {}),
    ...(step.origin?.sourceCardId ? { sourceCardId: step.origin.sourceCardId } : {}),
    ...(step.origin?.timing ? { timing: step.origin.timing } : {}),
    at: event.at,
  };
}

/** Plays a real server match against the bot and shows how its triggered effects are presented. */
export function EffectsLab() {
  const { locale } = useTranslation();
  const portuguese = locale === "pt-BR";
  const [run, setRun] = useState(0);
  const [scenario, setScenario] = useState<DevScenario>(initialScenario);
  const [pacing, setPacing] = useState<PresentationPacing>("sequential");
  const [panelOpen, setPanelOpen] = useState(true);
  const [rate, setRate] = useState(1);
  const [paused, setPaused] = useState(false);
  const [lab, dispatch] = useReducer(effectsLabReducer, emptyEffectsLab);
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const [copyStatus, setCopyStatus] = useState<string>();
  const controlsRef = useRef<PresentationControls | undefined>(undefined);
  const playbackRef = useRef({ rate, paused });
  playbackRef.current = { rate, paused };

  // Step events arrive inside the match screen's own effects; they are applied in batches so
  // the inspector does not re-render once per step. A timer rather than an animation frame,
  // because frames stop in a background tab and the match keeps playing there.
  const pendingActionsRef = useRef<EffectsLabAction[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const record = useCallback((action: EffectsLabAction) => {
    pendingActionsRef.current.push(action);
    if (flushTimerRef.current !== undefined) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = undefined;
      for (const pending of pendingActionsRef.current.splice(0)) dispatch(pending);
    }, 50);
  }, []);
  useEffect(() => () => clearTimeout(flushTimerRef.current), []);

  const stepKeysRef = useRef(new WeakMap<AnimationStep, string>());
  const stepSequenceRef = useRef(0);
  const runRef = useRef(run);
  runRef.current = run;
  // One probe per match: a match being torn down still reports its dropped steps, and those
  // must not land in the next match's timelines.
  const devProbe = useMemo<PresentationProbe>(() => {
    const generation = run;
    const current = () => runRef.current === generation;
    return {
      onQueue(controls) {
        if (!current()) return;
        controlsRef.current = controls;
        controls.queue.setRate(playbackRef.current.rate);
        if (playbackRef.current.paused) controls.queue.pause();
      },
      onStep(event) {
        if (!current()) return;
        let key = stepKeysRef.current.get(event.step);
        if (key === undefined) {
          stepSequenceRef.current += 1;
          key = `${stepSequenceRef.current}`;
          stepKeysRef.current.set(event.step, key);
        }
        record({ type: "step", event: labStepEvent(key, event) });
      },
      onBatch(batch) {
        if (!current()) return;
        record({ type: "batch", batch, at: performance.now() });
      },
      onDecision(decision) {
        if (!current()) return;
        record({ type: "decision", decision, at: performance.now() });
      },
    };
  }, [record, run]);

  const player = useMemo(loadIdentity, []);
  const joinOptions = useMemo<AegisJoinOptions>(() => {
    const deck = CATALOG_DECKS.find((entry) => entry.deckId === "bt26-dgo-2026-08-28-7-chronomon");
    if (!deck) throw new Error("Missing BT26 Chronomon demo deck");
    return {
      displayName: player.name,
      deckId: deck.deckId,
      deckName: deck.name,
      deck: { mainDeck: [...deck.decklist.mainDeck], eggDeck: [...deck.decklist.eggDeck] },
      devScenario: scenario,
    };
  }, [player, scenario]);

  const reset = useCallback(() => {
    controlsRef.current = undefined;
    setPaused(false);
    setSelectedBatchId(undefined);
    pendingActionsRef.current.length = 0;
    dispatch({ type: "reset" });
    setRun((current) => current + 1);
  }, []);

  function changeRate(next: number) {
    setRate(next);
    controlsRef.current?.queue.setRate(next);
  }

  function togglePause() {
    const queue = controlsRef.current?.queue;
    if (paused) queue?.resume();
    else queue?.pause();
    setPaused(!paused);
  }

  function stepOnce() {
    const queue = controlsRef.current?.queue;
    if (!queue) return;
    if (!paused) {
      queue.pause();
      setPaused(true);
    }
    queue.stepOnce();
  }

  function skip() {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.queue.resume();
    setPaused(false);
    controls.fastForward();
  }

  const documentPlayback = useMemo(createDocumentPlayback, []);
  useEffect(() => {
    documentPlayback.apply(rate, paused);
    if (rate === 1 && !paused) return;
    let frame = requestAnimationFrame(function reapply() {
      documentPlayback.apply(rate, paused);
      frame = requestAnimationFrame(reapply);
    });
    return () => cancelAnimationFrame(frame);
  }, [documentPlayback, rate, paused]);

  async function copyTrace() {
    const trace = effectsLabTrace(lab, { scenario, pacing, rate, paused, userAgent: navigator.userAgent });
    try {
      await navigator.clipboard.writeText(trace);
      setCopyStatus(portuguese ? "Copiado" : "Copied");
    } catch {
      setCopyStatus(portuguese ? "Falha ao copiar" : "Copy failed");
    }
  }

  const note = LAB_NOTES[scenario] ?? SCENARIO_NOTES[scenario];

  return (
    <div className={`aegis-effects-lab${panelOpen ? "" : " aegis-effects-lab--collapsed"}`}>
      <div className="aegis-effects-lab-stage">
        <LabGameScreen
          key={`${scenario}-${run}`}
          joinOptions={joinOptions}
          identityColor={colorKey(player.color)}
          startMode="bot"
          botDeckId="bt26-dgo-2026-08-28-8-plutomon"
          onExit={reset}
          devProbe={devProbe}
          presentationPacing={pacing}
        />
      </div>
      <aside className="aegis-effects-lab-panel" aria-label={portuguese ? "Inspetor" : "Inspector"}>
        <button
          type="button"
          className="aegis-effects-lab-toggle"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((open) => !open)}
        >
          {panelOpen ? (portuguese ? "Recolher ›" : "Collapse ›") : "‹"}
        </button>
        {panelOpen ? (
          <div className="aegis-effects-lab-panel-body">
            <section className="aegis-effects-lab-section">
              <h2>{portuguese ? "Controles" : "Controls"}</h2>
              <div className="aegis-effects-lab-controls">
                <label className="aegis-effects-lab-field aegis-effects-lab-field--wide">
                  <span>{portuguese ? "Cenário" : "Scenario"}</span>
                  <select
                    value={scenario}
                    onChange={(event) => {
                      setScenario(event.target.value as DevScenario);
                      reset();
                    }}
                  >
                    {SCENARIO_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={reset}>
                  {portuguese ? "Reiniciar" : "Reset"}
                </button>
                <button type="button" aria-pressed={paused} onClick={togglePause}>
                  {paused ? (portuguese ? "Continuar" : "Resume") : portuguese ? "Pausar" : "Pause"}
                </button>
                <button type="button" onClick={stepOnce} title="Pause, then start exactly one queued step">
                  {portuguese ? "Passo" : "Step"}
                </button>
                <button type="button" onClick={skip} title="Resume and fast-forward the current cues">
                  {portuguese ? "Pular" : "Skip"}
                </button>
                <label className="aegis-effects-lab-field">
                  <span>{portuguese ? "Velocidade" : "Speed"}</span>
                  <select value={rate} onChange={(event) => changeRate(Number(event.target.value))}>
                    {RATES.map((value) => (
                      <option key={value} value={value}>
                        {value}x
                      </option>
                    ))}
                  </select>
                </label>
                <label className="aegis-effects-lab-field">
                  <span>{portuguese ? "Ritmo" : "Pacing"}</span>
                  <select value={pacing} onChange={(event) => setPacing(event.target.value as PresentationPacing)}>
                    {PACINGS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => void copyTrace()}>
                  {portuguese ? "Copiar trace" : "Copy trace"}
                </button>
                {copyStatus ? <span className="aegis-effects-lab-muted">{copyStatus}</span> : null}
              </div>
              <details className="aegis-effects-lab-instructions" open>
                <summary>{portuguese ? "Instruções do cenário" : "Scenario instructions"}</summary>
                <p tabIndex={0}>{note ? (portuguese ? note.ptBR : note.en) : "–"}</p>
              </details>
            </section>
            <PacingTuner portuguese={portuguese} />
            <ServerTimeline
              lab={lab}
              portuguese={portuguese}
              selectedBatchId={selectedBatchId}
              onSelect={(batchId) => setSelectedBatchId((current) => (current === batchId ? undefined : batchId))}
            />
            <AnimationTimeline lab={lab} portuguese={portuguese} selectedBatchId={selectedBatchId} />
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function ServerTimeline({
  lab,
  portuguese,
  selectedBatchId,
  onSelect,
}: {
  lab: EffectsLabState;
  portuguese: boolean;
  selectedBatchId: string | undefined;
  onSelect: (batchId: string) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lab.batches.length]);
  return (
    <section className="aegis-effects-lab-section">
      <h2>
        {portuguese ? "Linha do servidor" : "Server timeline"}{" "}
        <span className="aegis-effects-lab-muted">({lab.batches.length})</span>
      </h2>
      <ol className="aegis-effects-lab-batches" ref={listRef}>
        {lab.batches.map((batch) => (
          <li key={batch.id}>
            <button
              type="button"
              className="aegis-effects-lab-batch"
              aria-pressed={selectedBatchId === batch.id}
              onClick={() => onSelect(batch.id)}
            >
              <span className="aegis-effects-lab-batch-head">
                <strong>v{batch.stateVersion}</strong>
                <span className="aegis-effects-lab-muted">
                  {batch.id} · {Math.round(batch.receivedAt)} ms
                </span>
              </span>
              <span className="aegis-effects-lab-kinds">
                {batch.events.map((event) => event.kind).join(", ") || "–"}
              </span>
            </button>
            {batchEventRows(batch)
              .filter((row) => row.description !== undefined)
              .map((row) => (
                <div
                  key={row.seq}
                  className={`aegis-effects-lab-effect aegis-effects-lab-effect--${row.kind === "effectTriggered" ? "triggered" : "resolved"}`}
                >
                  <span>
                    {row.kind === "effectTriggered" ? "▶" : "✓"} seat {row.seat} · {row.sourceCardId}
                    {row.timing ? ` · ${row.timing}` : ""}
                  </span>
                  <span className="aegis-effects-lab-muted">{row.description}</span>
                </div>
              ))}
          </li>
        ))}
      </ol>
    </section>
  );
}

function AnimationTimeline({
  lab,
  portuguese,
  selectedBatchId,
}: {
  lab: EffectsLabState;
  portuguese: boolean;
  selectedBatchId: string | undefined;
}) {
  const [zoom, setZoom] = useState<number>(0.1);
  const [follow, setFollow] = useState(true);
  const bars = useMemo(() => stepBars(lab.stepEvents), [lab.stepEvents]);
  const { running, queued } = activeSteps(bars);
  const [now, setNow] = useState(() => performance.now());
  const busy = running.length > 0 || queued.length > 0;
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setNow(performance.now()), 200);
    return () => clearInterval(timer);
  }, [busy]);
  const clock = busy ? now : Math.max(now, ...bars.map((bar) => bar.endedAt ?? 0));
  const bounds = timelineBounds(bars, clock);
  const lanes = trackLanes(bars);
  const highlighted = selectedBatchId === undefined ? undefined : stepKeysOfBatch(bars, selectedBatchId);
  const width = Math.max(1, (bounds.end - bounds.start) * zoom) + 24;
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (follow && scroller) scroller.scrollLeft = scroller.scrollWidth;
  });
  const ticks: number[] = [];
  const firstTick = Math.ceil(bounds.start / 1000) * 1000;
  for (let tick = firstTick; tick <= bounds.end && ticks.length < 600; tick += 1000) ticks.push(tick);

  return (
    <section className="aegis-effects-lab-section">
      <h2>
        {portuguese ? "Linha de animação" : "Animation timeline"}{" "}
        <span className="aegis-effects-lab-muted">({bars.length})</span>
      </h2>
      <div className="aegis-effects-lab-controls">
        <label className="aegis-effects-lab-field">
          <span>Zoom</span>
          <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
            {ZOOMS.map((value) => (
              <option key={value} value={value}>
                {value * 1000} px/s
              </option>
            ))}
          </select>
        </label>
        <label className="aegis-effects-lab-check">
          <input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />
          {portuguese ? "Seguir" : "Follow"}
        </label>
      </div>
      <div className="aegis-effects-lab-gantt">
        <div className="aegis-effects-lab-lane-labels">
          <div className="aegis-effects-lab-axis-label">ms</div>
          {lanes.map((lane) => (
            <div key={lane.track} className="aegis-effects-lab-lane-label" title={lane.track}>
              {lane.track}
            </div>
          ))}
        </div>
        <div className="aegis-effects-lab-lanes" ref={scrollRef}>
          <div style={{ width }}>
            <div className="aegis-effects-lab-axis">
              {ticks.map((tick) => (
                <span key={tick} style={{ left: (tick - bounds.start) * zoom }}>
                  {Math.round(tick)}
                </span>
              ))}
            </div>
            {lanes.map((lane) => (
              <div key={lane.track} className="aegis-effects-lab-lane">
                {lane.bars.map((bar) => (
                  <StepBarView
                    key={bar.key}
                    bar={bar}
                    left={(barSpan(bar, clock).start - bounds.start) * zoom}
                    width={(barSpan(bar, clock).end - barSpan(bar, clock).start) * zoom}
                    color={trackColor(lane.track)}
                    highlight={highlighted === undefined ? undefined : highlighted.has(bar.key)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="aegis-effects-lab-active">
        <h3>
          {portuguese ? "Rodando" : "Running"} ({running.length})
        </h3>
        <ActiveList bars={running} clock={clock} />
        <h3>
          {portuguese ? "Na fila" : "Queued"} ({queued.length})
        </h3>
        <ActiveList bars={queued} clock={clock} />
      </div>
    </section>
  );
}

function StepBarView({
  bar,
  left,
  width,
  color,
  highlight,
}: {
  bar: StepBar;
  left: number;
  width: number;
  color: string;
  highlight: boolean | undefined;
}) {
  const classes = [
    "aegis-effects-lab-bar",
    `aegis-effects-lab-bar--${bar.status}`,
    highlight === true ? "aegis-effects-lab-bar--highlight" : "",
    highlight === false ? "aegis-effects-lab-bar--dim" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} title={stepTooltip(bar)} style={{ left, width: Math.max(2, width), background: color }} />
  );
}

function ActiveList({ bars, clock }: { bars: readonly StepBar[]; clock: number }) {
  if (bars.length === 0) return <p className="aegis-effects-lab-muted">–</p>;
  return (
    <ul className="aegis-effects-lab-active-list">
      {bars.map((bar) => (
        <li key={bar.key} title={stepTooltip(bar)}>
          <span className="aegis-effects-lab-swatch" style={{ background: trackColor(bar.track) }} />
          <span>{bar.stepId}</span>
          <span className="aegis-effects-lab-muted">
            {bar.track} · {Math.round(clock - (bar.startedAt ?? bar.queuedAt ?? clock))} ms
          </span>
        </li>
      ))}
    </ul>
  );
}

function trackColor(track: string): string {
  let hash = 0;
  for (const character of track) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 65% 55%)`;
}
