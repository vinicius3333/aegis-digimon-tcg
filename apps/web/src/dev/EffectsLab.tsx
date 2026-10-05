import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  CATALOG_DECKS,
  KEYWORD_PACING_SCENARIOS,
  KEYWORD_TURN_PACING_SCENARIOS,
  KEYWORD_PROTECTION_PACING_SCENARIOS,
  KEYWORD_STACK_PACING_SCENARIOS,
  type KeywordPacingScenario,
} from "@aegis/shared";
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
import { PacingTuner, useLabPacing } from "./PacingTuner";
import { observeGateExpiry } from "../game/match/presentationGate";
import { presentationTelemetry } from "../game/presentationTelemetry";
import { AnimationInventory } from "./AnimationInventory";
import { createLiveMotionProbe } from "./liveMotionProbe";
import { LiveMotionHarness } from "./LiveMotionHarness";
import "./effectsLab.css";

type DevScenario = NonNullable<AegisJoinOptions["devScenario"]>;
const keywordScenarios: readonly KeywordPacingScenario[] = KEYWORD_PACING_SCENARIOS;

const SCENARIO_OPTIONS: readonly (readonly [DevScenario, string])[] = [
  ...KEYWORD_STACK_PACING_SCENARIOS.map(
    (scenario) =>
      [
        scenario.id,
        `Keyword pacing · ${scenario.flow === "de-digivolve" ? `De-Digivolve · ${scenario.removedCount} levels` : `Digi-Burst · ${scenario.deletesTarget ? "delete at zero DP" : "reduce DP"}`}`,
      ] as const,
  ),
  ...KEYWORD_PROTECTION_PACING_SCENARIOS.map(
    (scenario) =>
      [scenario.id, `Keyword pacing · ${scenario.keyword} · ${scenario.accept ? "accept" : "decline"}`] as const,
  ),
  ...KEYWORD_TURN_PACING_SCENARIOS.map(
    (scenario) =>
      [
        scenario.id,
        `Keyword pacing · ${scenario.keyword}${scenario.flow === "block" ? ` · ${scenario.accept ? "accept" : "decline"}` : ""}`,
      ] as const,
  ),
  ...keywordScenarios.map(
    (scenario) =>
      [
        scenario.id,
        `Keyword pacing · ${scenario.keyword}${scenario.decision ? ` · ${scenario.decision.accept ? "accept" : "decline"}` : ""}`,
      ] as const,
  ),
  ["effects-lab-field-grouping", "Field grouping · activate both copies"],
  ["effects-lab-own-chain", "Effects lab · own trigger chain"],
  ["effects-lab-opponent-chain", "Effects lab · opponent trigger chain"],
  ["effects-lab-opponent-play", "Effects lab · opponent confirmed play and On Play"],
  ["effects-lab-nested", "Effects lab · nested triggers"],
  ["effects-lab-prod-royal-knights", "Effects lab · production Royal Knights"],
  ["effects-lab-prod-ghost", "Effects lab · production Ghost"],
  ["effects-lab-prod-ghost-execute", "Effects lab · production Execute, 8 On Deletion"],
  ["effects-lab-prod-ghost-execute-security", "Effects lab · production Execute through a Security"],
  ["effects-lab-prod-attack-stack", "Effects lab · production attack, 4 When Attacking"],
  ["effects-lab-prod-security-removed", "Effects lab · production security removed, 3 watchers"],
  ["effects-lab-prod-titan-cascade", "Effects lab · production Titan hand-trash cascade"],
  ["arena-ex13-deletion-trigger-ordering", "EX13 Kings · deletion trigger ordering"],
  ["arena-gate-deadly-sins-effect-order", "EX6 Gate of Deadly Sins · effect resolution plan"],
  ["arena-security-effect-pacing", "Security effects · pacing"],
  ["arena-ex13-giromon-block-triggers", "EX13 Giromon · 6 block triggers"],
  ["arena-drasil-optional-effect-presets", "Optional effects · King Drasil accept or decline"],
];

const LAB_NOTES: Partial<Record<DevScenario, ScenarioCopy>> = {
  ...Object.fromEntries(
    KEYWORD_STACK_PACING_SCENARIOS.map((scenario) => [
      scenario.id,
      scenario.flow === "de-digivolve"
        ? {
            en: `End breeding, play ${scenario.optionCardId === "BT2-105" ? "Spider Shooter" : "Infinity Cannon"} and select one Phoenixmon. Watch each top leave in order while the other copy keeps its stack. The level-three floor protects Yokomon.`,
            ptBR: `Encerre a criação, jogue ${scenario.optionCardId === "BT2-105" ? "Spider Shooter" : "Infinity Cannon"} e selecione um Phoenixmon. Acompanhe cada topo saindo em ordem, enquanto a outra cópia mantém a pilha. O limite de nível três protege Yokomon.`,
          }
        : {
            en: `End breeding and activate one WarGrowlmon. Trash Cupimon and Salamon for Digi-Burst, then follow the two source peels and ${scenario.deletesTarget ? "Dracomon's deletion at zero DP" : "Phoenixmon's DP reduction"}. The other WarGrowlmon keeps its sources.`,
            ptBR: `Encerre a criação e ative um WarGrowlmon. Descarte Cupimon e Salamon para Digi-Burst, depois acompanhe as duas fontes saindo e ${scenario.deletesTarget ? "a deleção de Dracomon com zero DP" : "a redução de DP de Phoenixmon"}. O outro WarGrowlmon mantém suas fontes.`,
          },
    ]),
  ),
  ...Object.fromEntries(
    KEYWORD_PROTECTION_PACING_SCENARIOS.map((scenario) => [
      scenario.id,
      scenario.flow === "evade"
        ? {
            en: `End breeding and attack security with Groundramon. Death Claw targets the active Syakomon. ${scenario.accept ? "Accept Evade to suspend it and prevent deletion" : "Decline Evade to follow its deletion"}.`,
            ptBR: `Encerre a criação e ataque a segurança com Groundramon. Death Claw mira o Syakomon ativo. ${scenario.accept ? "Aceite Evade para suspendê-lo e evitar a deleção" : "Recuse Evade para acompanhar sua deleção"}.`,
          }
        : {
            en: `End breeding and attack Phoenixmon with Flamedramon. ${scenario.accept ? "Select Flamedramon in Armor Purge and confirm: its armor is trashed and Monodramon remains suspended" : "Pass the Armor Purge choice: both cards leave the field"}. Watch the blow finish before the protection question.`,
            ptBR: `Encerre a criação e ataque Phoenixmon com Flamedramon. ${scenario.accept ? "Selecione Flamedramon em Armor Purge e confirme: sua armadura vai ao lixo e Monodramon permanece suspenso" : "Passe a escolha de Armor Purge: as duas cartas saem do campo"}. Acompanhe o impacto antes da pergunta de proteção.`,
          },
    ]),
  ),
  ...Object.fromEntries(
    KEYWORD_TURN_PACING_SCENARIOS.map((scenario) => [
      scenario.id,
      scenario.flow === "block"
        ? {
            en: `End breeding and your turn. When Phoenixmon attacks, ${scenario.accept ? "click Kokatorimon to block" : "choose Take the attack, no block"}. Watch the arrow change target before battle, or continue to security.`,
            ptBR: `Encerre a criação e seu turno. Quando Phoenixmon atacar, ${scenario.accept ? "clique em Kokatorimon para bloquear" : "escolha receber o ataque sem bloquear"}. Acompanhe a troca de alvo da seta antes da batalha ou a continuação até a segurança.`,
          }
        : {
            en: "End breeding. Attack each suspended Agumon with Meteormon, BlackWarGreymon and Monodramon, then end your turn. During the opponent's unsuspend phase, only the two Reboot holders turn upright.",
            ptBR: "Encerre a criação. Ataque cada Agumon suspenso com Meteormon, BlackWarGreymon e Monodramon e encerre seu turno. Na fase de desvirar do oponente, só as duas cartas com Reboot desviram.",
          },
    ]),
  ),
  "effects-lab-field-grouping": {
    en: "End breeding and activate each Izzy Izumi's Main effect. The first suspended copy leaves the group; the second rejoins it. Watch the artwork turn separately from the group movement.",
    ptBR: "Encerre a criação e ative o efeito Principal de cada Izzy Izumi. A primeira cópia suspensa sai do grupo; a segunda volta a se agrupar com ela. A rotação da carta tem seu próprio tempo, separado do deslocamento.",
  },
  ...Object.fromEntries(
    keywordScenarios.map((scenario) => [
      scenario.id,
      {
        en: `Real server ${scenario.keyword} scenario. End breeding, then drag your Digimon onto ${scenario.target === "player" ? "the opponent's security" : "the suspended opposing Digimon"}.${scenario.decision ? ` ${scenario.decision.accept ? "Accept" : "Decline"} the keyword decision${scenario.decision.kind === "Alliance" && scenario.decision.accept ? " by choosing Monodramon on the field" : ""}.` : ""} The printed cards and engine resolve the result.`,
        ptBR: `Cenário de ${scenario.keyword} no servidor real. Encerre a criação e arraste seu Digimon para ${scenario.target === "player" ? "a segurança do oponente" : "o Digimon suspenso do oponente"}.${scenario.decision ? ` ${scenario.decision.accept ? "Aceite" : "Recuse"} a decisão da keyword${scenario.decision.kind === "Alliance" && scenario.decision.accept ? " escolhendo Monodramon no campo" : ""}.` : ""} As cartas e a engine resolvem o resultado.`,
      },
    ]),
  ),
  "effects-lab-own-chain": {
    en: "Pass breeding, then digivolve Golemon into Megadramon. Six of your effects trigger at once: plan their order and watch each resolve.",
    ptBR: "Passe a criação e digievolua Golemon em Megadramon. Seis efeitos seus disparam juntos: planeje a ordem e acompanhe cada um.",
  },
  "effects-lab-opponent-chain": {
    en: "Pass breeding, then end your turn. The bot resolves five start-of-main effects with no prompt for you.",
    ptBR: "Passe a criação e encerre o turno. O bot resolve cinco efeitos de início da fase principal sem nenhuma escolha sua.",
  },
  "effects-lab-opponent-play": {
    en: "Pass breeding, then end your turn. The bot plays Gabumon from hand: watch the showcase, field flight, landing and its On Play draw in order.",
    ptBR: "Passe a criação e encerre o turno. O bot joga Gabumon da mão: acompanhe a apresentação, o voo ao campo, a chegada e a compra de Ao Jogar nessa ordem.",
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

  "effects-lab-prod-ghost-execute": {
    en: "Production chain. Pass breeding, end your turn, accept the Execute attack. Its deletion asks you to order eight [On Deletion] effects.",
    ptBR: "Cadeia de produção. Passe a criação, encerre o turno e aceite o ataque Execute. A deleção pede para ordenar oito efeitos [Ao Ser Deletado].",
  },
  "effects-lab-prod-ghost-execute-security": {
    en: "The same Execute chain, but the check reveals the bot's Our Courage United, whose [Security] resolves before the deletion.",
    ptBR: "A mesma cadeia de Execute, mas a checagem revela Our Courage United do bot, cujo [Segurança] resolve antes da deleção.",
  },
  "effects-lab-prod-attack-stack": {
    en: "Production chain. Pass breeding, then digivolve Omnimon into Omnimon Zwart. It attacks at once: four [When Attacking] effects, then the bot's GrapLeomon and Callismon answer.",
    ptBR: "Cadeia de produção. Passe a criação e digievolua Omnimon em Omnimon Zwart. Ele ataca na hora: quatro efeitos [Ao Atacar] e depois GrapLeomon e Callismon do bot respondem.",
  },
  "effects-lab-prod-security-removed": {
    en: "Production chain. Pass breeding, then attack the player with Jupitermon: Wrath Mode. Adding your security card to the hand wakes three watchers and a digivolution.",
    ptBR: "Cadeia de produção. Passe a criação e ataque o jogador com Jupitermon: Wrath Mode. Colocar sua carta de segurança na mão acorda três observadores e uma digievolução.",
  },
  "effects-lab-prod-titan-cascade": {
    en: "Production chain. Pass breeding, then attack the player with Plutomon. Trash Dobermon and play Witchmon from the trash: five effects trigger together.",
    ptBR: "Cadeia de produção. Passe a criação e ataque o jogador com Plutomon. Descarte Dobermon e jogue Witchmon do lixo: cinco efeitos disparam juntos.",
  },
};

const RATES = [0.25, 0.5, 1, 2, 4] as const;
// The queued presentation protocol is named sequential; its match timing is stacked.
const MATCH_PACING: PresentationPacing = "sequential";
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
  const [panelOpen, setPanelOpen] = useState(true);
  useLabPacing();
  const [rate, setRate] = useState(1);
  const [paused, setPaused] = useState(false);
  const [lab, dispatch] = useReducer(effectsLabReducer, emptyEffectsLab);
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const [copyStatus, setCopyStatus] = useState<string>();
  const motionProbe = useMemo(() => createLiveMotionProbe(), []);
  useEffect(() => {
    const globals = window as unknown as Record<string, unknown>;
    const motionKey = "__aegisLiveMotion";
    globals[motionKey] = motionProbe;
    return () => {
      motionProbe.stop();
      if (globals[motionKey] === motionProbe) delete globals[motionKey];
    };
  }, [motionProbe]);
  useEffect(() => motionProbe.reset(), [motionProbe, run]);
  const controlsRef = useRef<PresentationControls | undefined>(undefined);
  // A read-only dev bridge lets browser tests inspect the same room, snapshots and queue
  // as this screen. It never opens an observer connection or sends game intents.
  const observedRef = useRef({
    board: undefined as { live: unknown; displayed: unknown; visible: unknown; viewerSeat: number } | undefined,
    decision: undefined as unknown,
    steps: [] as LabStepEvent[],
    events: [] as unknown[],
    batches: [] as { id: string; receivedAt: number; stateVersion: number; events: unknown[] }[],
    gateExpiries: [] as string[],
    truncated: false,
  });
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const globals = window as unknown as Record<string, unknown>;
    const labKey = "__aegisEffectsLab";
    const read = Object.assign(
      () => ({
        scenario,
        ...observedRef.current,
        pendingSteps: controlsRef.current?.queue.pendingCount(),
        queueIdle: controlsRef.current?.queue.isIdle(),
        counters: presentationTelemetry.read().counters,
      }),
      {
        reset() {
          observedRef.current.steps = [];
          observedRef.current.events = [];
          observedRef.current.batches = [];
          observedRef.current.gateExpiries = [];
          observedRef.current.truncated = false;
          presentationTelemetry.reset();
        },
      },
    );
    globals[labKey] = read;
    const stop = observeGateExpiry(({ label }) => observedRef.current.gateExpiries.push(label));
    return () => {
      stop();
      if (globals[labKey] === read) delete globals[labKey];
    };
  }, [scenario]);
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
        const observed = labStepEvent(key, event);
        observedRef.current.steps.push(observed);
        if (observedRef.current.steps.length > 4000) {
          observedRef.current.steps.shift();
          observedRef.current.truncated = true;
        }
        record({ type: "step", event: observed });
      },
      onBatch(batch) {
        if (!current()) return;
        const receivedAt = performance.now();
        observedRef.current.batches.push({
          id: batch.id,
          receivedAt,
          stateVersion: batch.stateVersion,
          events: JSON.parse(JSON.stringify(batch.events)),
        });
        if (observedRef.current.batches.length > 500) {
          observedRef.current.batches.shift();
          observedRef.current.truncated = true;
        }
        observedRef.current.events.push(...JSON.parse(JSON.stringify(batch.events)));
        if (observedRef.current.events.length > 2000) {
          observedRef.current.events.splice(0, observedRef.current.events.length - 2000);
          observedRef.current.truncated = true;
        }
        record({ type: "batch", batch, at: receivedAt });
      },
      onDecision(decision) {
        if (!current()) return;
        observedRef.current.decision = decision && JSON.parse(JSON.stringify(decision));
        record({ type: "decision", decision, at: performance.now() });
      },
      onBoard(board) {
        if (!current()) return;
        observedRef.current.board = JSON.parse(JSON.stringify(board));
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
    const trace = effectsLabTrace(lab, {
      scenario,
      pacing: MATCH_PACING,
      rate,
      paused,
      userAgent: navigator.userAgent,
    });
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
          presentationPacing={MATCH_PACING}
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
            <AnimationInventory state={lab} />
            <LiveMotionHarness probe={motionProbe} />
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
