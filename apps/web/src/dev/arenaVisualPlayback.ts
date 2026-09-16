import { useEffect, useMemo, useState } from "react";
import type { GameState } from "@aegis/shared";
import { snapshotGameState, type StateSnapshot } from "../net/presentedState";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import {
  arenaVisualCatalog,
  buildArenaVisualScene,
  type ArenaVisualScenarioInfo,
  type ArenaVisualScene,
  type SecurityBattleOutcome,
} from "./arenaVisualScenarios";

export interface ArenaVisualPlaybackController {
  active: boolean;
  playing: boolean;
  index: number;
  total: number;
  scenario: ArenaVisualScenarioInfo;
  stageLabel: string;
  controls: {
    start: () => void;
    startSecurityBattle: (outcome?: SecurityBattleOutcome) => void;
    pause: () => void;
    stop: () => void;
    next: () => void;
    previous: () => void;
    repeat: () => void;
    select: (index: number) => void;
  };
}
interface VisualFrame {
  scene: ArenaVisualScene;
  state: GameState;
  batches: readonly ServerBatch[];
  snapshots: readonly StateSnapshot[];
  label: string;
}

/** Pausing stops scene advancement; already-started match cues finish normally. */
export function useArenaVisualPlayback(
  manualState: GameState,
  manualLabels: ArenaVisualScene["keywordLabels"],
  portuguese = false,
) {
  const catalog = useMemo(() => arenaVisualCatalog(portuguese), [portuguese]);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const [seed, setSeed] = useState<{ state: GameState; labels: ArenaVisualScene["keywordLabels"] }>();
  const [securityOutcome, setSecurityOutcome] = useState<SecurityBattleOutcome>("attackerWins");
  const [frame, setFrame] = useState<VisualFrame>();
  const [finished, setFinished] = useState(false);
  const scenario = catalog[index]!;
  const scene = useMemo(
    () =>
      seed ? buildArenaVisualScene(seed.state, scenario.keyword, portuguese, seed.labels, securityOutcome) : undefined,
    [seed, scenario.keyword, portuguese, securityOutcome, run],
  );
  function resetScene(next: number) {
    setIndex(next);
    setRun((previous) => previous + 1);
  }
  const controls: ArenaVisualPlaybackController["controls"] = {
    start() {
      setSecurityOutcome("attackerWins");
      if (!active) {
        setSeed({ state: snapshotGameState(manualState), labels: manualLabels });
        setRun((previous) => previous + 1);
        setActive(true);
      }
      setPlaying(true);
    },
    startSecurityBattle(outcome = "attackerWins") {
      setSecurityOutcome(outcome);
      const securityIndex = catalog.findIndex((entry) => entry.keyword === "SecurityAttack");
      if (securityIndex < 0) return;
      setSeed({ state: snapshotGameState(manualState), labels: manualLabels });
      resetScene(securityIndex);
      setActive(true);
      // Run this scene once; keep the player available for replay and closing.
      setPlaying(false);
    },
    pause() {
      setPlaying(false);
    },
    stop() {
      setActive(false);
      setPlaying(false);
      setFrame(undefined);
      setFinished(false);
    },
    next() {
      resetScene((index + 1) % catalog.length);
    },
    previous() {
      resetScene((index + catalog.length - 1) % catalog.length);
    },
    repeat() {
      resetScene(index);
    },
    select(next) {
      if (Number.isInteger(next) && next >= 0 && next < catalog.length) resetScene(next);
    },
  };
  useEffect(() => {
    if (!active || !scene) return;
    // GameScreen mounts with an empty event history; the first stage is a later tick.
    setFinished(false);
    setFrame({
      scene,
      state: scene.initialState,
      batches: [],
      snapshots: [],
      label: portuguese ? "Preparação do cenário" : "Scene preparation",
    });
    const timers = scene.stages.map((stage) =>
      window.setTimeout(() => {
        const batch = singleServerBatch(stage.events, stage.beforeState.stateVersion);
        setFrame((previous) => ({
          scene,
          state: stage.state,
          batches: stage.events.length ? [...(previous?.batches ?? []), batch] : (previous?.batches ?? []),
          snapshots: [
            ...(previous?.snapshots ?? []),
            { stateVersion: stage.beforeState.stateVersion, state: stage.beforeState },
            { stateVersion: stage.state.stateVersion, state: stage.state },
          ],
          label: stage.label,
        }));
      }, stage.atMs),
    );
    timers.push(window.setTimeout(() => setFinished(true), scene.durationMs));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [active, scene, portuguese]);
  useEffect(() => {
    if (!active || !playing || !finished) return;
    const timer = window.setTimeout(() => {
      setIndex((previous) => (previous + 1) % catalog.length);
      setRun((previous) => previous + 1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [active, playing, finished, catalog.length]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  // A new scene must mount before its frame effect runs; never reuse the previous scene's events.
  const readyFrame = frame?.scene === scene ? frame : undefined;
  const connection =
    active && scene
      ? {
          state: readyFrame?.state ?? scene.initialState,
          batches: readyFrame?.batches ?? [],
          snapshots: readyFrame?.snapshots ?? [],
          events: (readyFrame?.batches ?? []).flatMap((batch) => batch.events),
          keywordLabels: scene.keywordLabels,
        }
      : undefined;
  const controller: ArenaVisualPlaybackController = {
    active,
    playing,
    index,
    total: catalog.length,
    scenario,
    stageLabel: readyFrame?.label ?? (portuguese ? "Preparação do cenário" : "Scene preparation"),
    controls,
  };
  return { controller, connection, gameKey: active ? `visual-${index}-${run}` : "manual" };
}
