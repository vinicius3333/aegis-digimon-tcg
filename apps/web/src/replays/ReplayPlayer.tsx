import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchReplay, Seat } from "@aegis/shared";
import { GameScreen } from "../game/GameScreen";
import { buildMatchLog } from "../game/matchLog";
import type { PresentationControls, PresentationProbe } from "../game/presentationProbe";
import { useTranslation } from "../i18n";
import { Icons } from "../design/icons";
import { Button } from "../design/primitives";
import { createPlaybackClock, frameDelay, playbackState, presentationEnd, turnPositions } from "./playback";
import { SEQUENTIAL_PACING_ENABLED } from "../features";
import { ReplayVideoExport } from "./ReplayVideoExport";
import { createAnimationPlayback } from "../game/animationPlayback";

const emptyDeck = { mainDeck: [], eggDeck: [] };
const acknowledgeDecision = () => undefined;

export function ReplayPlayer({
  replay,
  onClose,
  devProbe,
  exportRequested,
}: {
  replay: MatchReplay;
  onClose: () => void;
  devProbe?: PresentationProbe;
  exportRequested?: boolean;
}) {
  const observer = useRef(devProbe);
  observer.current = devProbe;
  const { t, locale } = useTranslation();
  const [cursor, setCursor] = useState({ index: 0, from: 0, epoch: 0, animate: false });
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [settled, setSettled] = useState(true);
  const clock = useMemo(() => createPlaybackClock(), []);
  const [speed, setSpeed] = useState(1);
  const [showHand, setShowHand] = useState(true);
  const [viewerSeat, setViewerSeat] = useState<Seat>(replay.viewerSeat);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const history = useRef<HTMLElement>(null);
  const historyToggle = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLElement>(null);
  const controls = useRef<PresentationControls | undefined>(undefined);
  const painted = useMemo(
    () =>
      createAnimationPlayback(
        () => surface.current?.querySelector(".replay-player__board")?.getAnimations({ subtree: true }) ?? [],
      ),
    [],
  );
  useEffect(() => {
    let frameId: number;
    const sync = () => {
      painted.apply(speed, !playing);
      frameId = requestAnimationFrame(sync);
    };
    sync();
    return () => cancelAnimationFrame(frameId);
  }, [painted, speed, playing]);
  useEffect(() => () => painted.release(), [painted]);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const turns = useMemo(() => turnPositions(replay), [replay]);
  const atEnd = cursor.index === replay.frames.length - 1;
  const state = useMemo(() => playbackState(replay, cursor.index, showHand), [replay, cursor.index, showHand]);
  const probe = useMemo<PresentationProbe>(
    () => ({
      onQueue(next) {
        controls.current = next;
        next.queue.setRate(speedRef.current);
        next.queue.resume();
        observer.current?.onQueue?.(next);
      },
      onStep(event) {
        observer.current?.onStep?.(event);
      },
      onBatch(batch) {
        observer.current?.onBatch?.(batch);
      },
      onBoard(board) {
        observer.current?.onBoard?.(board);
      },
    }),
    [],
  );
  const labels = useMemo(
    () =>
      replay.frames.map(
        (entry) =>
          buildMatchLog(entry.events, replay.viewerSeat, new Map(), t, 1)[0]?.text ??
          `${t("replay.turn")} ${entry.state.turnCount} · ${entry.state.phase}`,
      ),
    [replay, t],
  );
  const presentedFrames = useMemo(
    () => (cursor.animate ? replay.frames.slice(cursor.from, cursor.index + 1) : []),
    [replay, cursor],
  );
  const batches = useMemo(
    () =>
      presentedFrames.map((entry, offset) => ({
        id: entry.events[0]?.batch ?? `replay-${cursor.from + offset}`,
        stateVersion: entry.state.stateVersion,
        events: entry.events,
      })),
    [presentedFrames, cursor.from],
  );
  // Every dependency in this causal span arrives before the queue waits for it.
  const events = useMemo(() => presentedFrames.flatMap((entry) => entry.events), [presentedFrames]);
  const snapshotStart = Math.min(Math.max(0, cursor.index - 39), Math.max(0, cursor.from - 1));
  const connection = useMemo(
    () => ({
      room: undefined,
      status: "connected" as const,
      state,
      events,
      batches,
      decision: undefined,
      acknowledgeDecision,
      error: undefined,
      snapshots: replay.frames.slice(snapshotStart, cursor.index + 1).map((entry, offset) => ({
        stateVersion: entry.state.stateVersion,
        state: playbackState(replay, snapshotStart + offset, showHand),
      })),
      sessionId: `replay-seat-${viewerSeat}`,
      roomCode: "",
    }),
    [state, events, batches, viewerSeat, replay, cursor.index, snapshotStart, showHand],
  );

  useEffect(() => {
    clock.configure(speed, playing);
    controls.current?.queue.setRate(speed);
  }, [clock, speed, playing]);
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      if (!controls.current?.queue.isIdle()) return;
      if (atEnd) {
        setSettled(true);
        setPlaying(false);
        return;
      }
      if (clock.elapsed() < frameDelay(replay, cursor.index, 1)) return;
      clock.reset();
      setSettled(false);
      setCursor((current) => ({
        ...current,
        from: current.index + 1,
        index: presentationEnd(replay, current.index + 1),
        animate: true,
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [clock, playing, atEnd, replay, cursor.index]);
  useEffect(() => {
    if (!historyOpen) return;
    history.current?.querySelector<HTMLElement>('[aria-current="step"]')?.scrollIntoView({ block: "nearest" });
  }, [historyOpen, cursor.index]);
  useEffect(() => {
    if (!historyOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHistoryOpen(false);
        historyToggle.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [historyOpen]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const position = () => {
      const hand = element.querySelector('[data-testid="hand"]')?.getBoundingClientRect();
      element.style.setProperty(
        "--replay-hand-clearance",
        `${hand ? Math.max(12, window.innerHeight - hand.top + 12) : 12}px`,
      );
    };
    const mutations = new MutationObserver(position);
    mutations.observe(element.querySelector(".replay-player__board")!, { childList: true, subtree: true });
    const resize = new ResizeObserver(position);
    resize.observe(element);
    position();
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, [cursor.epoch, viewerSeat, showHand]);

  function seek(index: number) {
    setPlaying(false);
    setSettled(true);
    clock.reset();
    controls.current = undefined;
    setCursor((current) => ({
      index: Math.max(0, Math.min(replay.frames.length - 1, index)),
      from: Math.max(0, Math.min(replay.frames.length - 1, index)),
      epoch: current.epoch + 1,
      animate: false,
    }));
  }
  function togglePlay() {
    if (playing) {
      controls.current?.queue.pause();
      setPlaying(false);
      return;
    }
    if (atEnd && settled) seek(0);
    controls.current?.queue.resume();
    setPlaying(true);
  }
  const currentTurn = turns.filter((turn) => turn.index <= cursor.index).at(-1)!;
  const outcome =
    replay.winnerSeat < 0 ? t("replay.draw") : t("replay.winner", { name: replay.players[replay.winnerSeat]! });

  return (
    <section
      ref={surface}
      className={`replay-player${exporting ? " replay-player--exporting" : ""}`}
      aria-label={t("replay.title")}
    >
      <ReplayVideoExport
        replayId={replay.id}
        requested={exportRequested}
        finished={atEnd && settled}
        onPrepare={() => {
          seek(0);
          setSpeed(1);
          setShowHand(true);
          setHistoryOpen(false);
          setExporting(true);
        }}
        onStart={() => {
          controls.current?.queue.resume();
          setPlaying(true);
        }}
        onStop={() => {
          controls.current?.queue.pause();
          setPlaying(false);
          setExporting(false);
        }}
      />
      <header className="replay-player__heading">
        <Button
          variant="secondary"
          size="sm"
          icon={Icons.ChevronLeft}
          onClick={onClose}
          aria-label={t("replay.back")}
          title={t("replay.back")}
        >
          <span className="replay-player__back-label">{t("replay.back")}</span>
        </Button>
        <h1>
          {replay.players[0]} <span>vs</span> {replay.players[1]}
        </h1>
        <div className="replay-player__metadata">
          <time dateTime={new Date(replay.startedAt).toISOString()}>
            {new Date(replay.startedAt).toLocaleDateString(locale)}
          </time>
          <span className="replay-player__outcome">{outcome}</span>
        </div>
      </header>
      <p className="aegis-sr-only">{t("replay.perspective", { name: replay.players[replay.viewerSeat] })}</p>
      <div className="replay-player__body">
        <div className="replay-player__board">
          <GameScreen
            key={`${cursor.epoch}-${viewerSeat}`}
            replayMode
            presentationPacing={SEQUENTIAL_PACING_ENABLED ? "sequential" : "current"}
            joinOptions={{ displayName: replay.players[viewerSeat], deck: emptyDeck }}
            identityColor="Blue"
            demoConnection={connection}
            devProbe={probe}
            onExit={onClose}
          />
        </div>
        {historyOpen ? (
          <aside ref={history} id="replay-history" className="replay-history" aria-label={t("replay.log")}>
            <header>
              <h2>{t("replay.log")}</h2>
              <Button
                size="sm"
                variant="ghost"
                icon={Icons.X}
                aria-label={t("replay.historyClose")}
                onClick={() => {
                  setHistoryOpen(false);
                  historyToggle.current?.focus();
                }}
              />
            </header>
            <ol>
              {labels.map((label, index) => (
                <li key={index}>
                  <button
                    type="button"
                    aria-current={index === cursor.index ? "step" : undefined}
                    onClick={() => seek(index)}
                  >
                    <span className="replay-history__number">{index + 1}</span>
                    <span className="replay-history__entry">
                      <small>
                        {t("replay.turn")} {replay.frames[index]!.state.turnCount}
                      </small>
                      <span>{label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        ) : null}
      </div>
      <div className="replay-player__tools">
        <button
          ref={historyToggle}
          type="button"
          className="replay-player__tool"
          aria-label={t("replay.historyShow")}
          title={t("replay.historyShow")}
          aria-expanded={historyOpen}
          aria-controls="replay-history"
          onClick={() => setHistoryOpen((open) => !open)}
        >
          <Icons.FileText size={20} />
        </button>
        <button
          type="button"
          className="replay-player__tool"
          aria-label={t(controlsVisible ? "replay.controlsHide" : "replay.controlsShow")}
          title={t(controlsVisible ? "replay.controlsHide" : "replay.controlsShow")}
          aria-expanded={controlsVisible}
          aria-controls="replay-controls"
          onClick={() => setControlsVisible((visible) => !visible)}
        >
          <Icons.PlayCircle size={20} />
        </button>
      </div>
      <div
        id="replay-controls"
        className="replay-controls"
        role="group"
        aria-label={t("replay.title")}
        hidden={!controlsVisible}
      >
        <div className="replay-controls__timeline">
          <label htmlFor="replay-position">
            {t("replay.action", { current: cursor.index + 1, total: replay.frames.length })}
          </label>
          <input
            id="replay-position"
            type="range"
            min={0}
            max={replay.frames.length - 1}
            value={cursor.index}
            aria-label={t("replay.position")}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <span role="status">{atEnd && settled ? t("replay.finished") : labels[cursor.index]}</span>
        </div>
        <div className="replay-controls__buttons">
          <div className="replay-controls__transport">
            <Button
              size="sm"
              variant="secondary"
              disabled={cursor.index === 0}
              onClick={() => seek(0)}
              aria-label={t("replay.start")}
            >
              <Icons.ChevronLeft size={18} />
              <span className="replay-controls__edge" aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={cursor.index === 0}
              onClick={() => seek(cursor.index - 1)}
              aria-label={t("replay.previous")}
            >
              <Icons.ChevronLeft size={18} />
            </Button>
            <Button
              className="replay-controls__play"
              size="sm"
              icon={playing ? Icons.Pause : Icons.Play}
              onClick={togglePlay}
              aria-pressed={playing}
            >
              <span className="replay-controls__play-label">{t(playing ? "replay.pause" : "replay.play")}</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={atEnd}
              onClick={() => seek(cursor.index + 1)}
              aria-label={t("replay.next")}
            >
              <Icons.ChevronRight size={18} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={atEnd}
              onClick={() => seek(replay.frames.length - 1)}
              aria-label={t("replay.end")}
            >
              <Icons.ChevronRight size={18} />
              <span className="replay-controls__edge" aria-hidden="true" />
            </Button>
          </div>
          <details className="replay-controls__options">
            <summary aria-label={t("replay.options")}>
              <Icons.Settings size={20} />
              <span>{t("replay.options")}</span>
            </summary>
            <div className="replay-controls__settings">
              <label>
                <span>{t("replay.speedShort")}</span>
                <select
                  aria-label={t("replay.speed")}
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                >
                  {[0.5, 1, 2, 4].map((value) => (
                    <option key={value} value={value}>
                      {value}×
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("replay.turn")}</span>
                <select
                  aria-label={t("replay.turn")}
                  value={currentTurn.index}
                  onChange={(event) => seek(Number(event.target.value))}
                >
                  {turns.map((turn) => (
                    <option key={turn.index} value={turn.index}>
                      {turn.turn} · {replay.players[turn.seat]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("replay.hands")}</span>
                <select
                  aria-label={t("replay.hands")}
                  value={showHand ? "show" : "hide"}
                  onChange={(event) => {
                    seek(cursor.index);
                    setShowHand(event.target.value === "show");
                  }}
                >
                  <option value="show">{t("replay.hand.show")}</option>
                  <option value="hide">{t("replay.hand.hide")}</option>
                </select>
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  seek(cursor.index);
                  setViewerSeat((seat) => (1 - seat) as Seat);
                }}
              >
                {t("replay.flip")}
              </Button>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
