import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchReplay, Seat } from "@aegis/shared";
import { GameScreen } from "../game/GameScreen";
import { buildMatchLog } from "../game/matchLog";
import type { PresentationControls, PresentationProbe } from "../game/presentationProbe";
import { useTranslation } from "../i18n";
import { Button } from "../design/primitives";
import { frameDelay, playbackState, turnPositions } from "./playback";

const emptyDeck = { mainDeck: [], eggDeck: [] };
const acknowledgeDecision = () => undefined;

export function ReplayPlayer({ replay, onClose }: { replay: MatchReplay; onClose: () => void }) {
  const { t, locale } = useTranslation();
  const [cursor, setCursor] = useState({ index: 0, epoch: 0, animate: false });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showHand, setShowHand] = useState(true);
  const [viewerSeat, setViewerSeat] = useState<Seat>(replay.viewerSeat);
  const controls = useRef<PresentationControls | undefined>(undefined);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const turns = useMemo(() => turnPositions(replay), [replay]);
  const frame = replay.frames[cursor.index]!;
  const atEnd = cursor.index === replay.frames.length - 1;
  const state = useMemo(() => playbackState(replay, cursor.index, showHand), [replay, cursor.index, showHand]);
  const probe = useMemo<PresentationProbe>(
    () => ({
      onQueue(next) {
        controls.current = next;
        next.queue.setRate(speedRef.current);
        next.queue.resume();
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
  const batches = useMemo(
    () =>
      cursor.animate
        ? [
            {
              id: frame.events[0]?.batch ?? `replay-${cursor.index}`,
              stateVersion: frame.state.stateVersion,
              events: frame.events,
            },
          ]
        : [],
    [cursor, frame],
  );
  // The presentation layer receives only this closed batch. The history pane owns the full log.
  const events = useMemo(() => (cursor.animate ? frame.events : []), [cursor.animate, frame]);
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
      snapshots: replay.frames.slice(Math.max(0, cursor.index - 39), cursor.index + 1).map((entry, offset) => ({
        stateVersion: entry.state.stateVersion,
        state: playbackState(replay, Math.max(0, cursor.index - 39) + offset, showHand),
      })),
      sessionId: `replay-seat-${viewerSeat}`,
      roomCode: "",
    }),
    [state, events, batches, viewerSeat, replay, cursor.index, showHand],
  );

  useEffect(() => {
    controls.current?.queue.setRate(speed);
  }, [speed]);
  useEffect(() => {
    if (!playing || atEnd) return;
    const started = performance.now();
    const interval = setInterval(() => {
      if (performance.now() - started < frameDelay(replay, cursor.index, speed) || !controls.current?.queue.isIdle())
        return;
      setCursor((current) => ({
        ...current,
        index: Math.min(replay.frames.length - 1, current.index + 1),
        animate: true,
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [playing, atEnd, replay, cursor.index, speed]);
  useEffect(() => {
    if (atEnd) setPlaying(false);
  }, [atEnd]);

  function seek(index: number) {
    setPlaying(false);
    controls.current = undefined;
    setCursor((current) => ({
      index: Math.max(0, Math.min(replay.frames.length - 1, index)),
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
    if (atEnd) seek(0);
    controls.current?.queue.resume();
    setPlaying(true);
  }
  const currentTurn = turns.filter((turn) => turn.index <= cursor.index).at(-1)!;
  const outcome =
    replay.winnerSeat < 0 ? t("replay.draw") : t("replay.winner", { name: replay.players[replay.winnerSeat]! });

  return (
    <section className="replay-player" aria-label={t("replay.title")}>
      <header className="replay-player__heading">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t("replay.back")}
        </Button>
        <h1>
          {replay.players[0]} <span>vs</span> {replay.players[1]}
        </h1>
        <span>
          {new Date(replay.startedAt).toLocaleDateString(locale)} · {outcome}
        </span>
      </header>
      <p className="replay-player__perspective">
        {t("replay.perspective", { name: replay.players[replay.viewerSeat] })}
      </p>
      <div className="replay-player__body">
        <div className="replay-player__board">
          <GameScreen
            key={`${cursor.epoch}-${viewerSeat}`}
            replayMode
            joinOptions={{ displayName: replay.players[viewerSeat], deck: emptyDeck }}
            identityColor="Blue"
            demoConnection={connection}
            devProbe={probe}
            onExit={onClose}
          />
        </div>
        <aside className="replay-history" aria-label={t("replay.log")}>
          <h2>{t("replay.log")}</h2>
          <ol>
            {labels.map((label, index) => (
              <li key={index}>
                <button
                  type="button"
                  aria-current={index === cursor.index ? "step" : undefined}
                  onClick={() => seek(index)}
                >
                  <small>
                    {index + 1} · {t("replay.turn")} {replay.frames[index]!.state.turnCount}
                  </small>
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
      <div className="replay-controls" role="group" aria-label={t("replay.title")}>
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
          <span role="status">{atEnd ? t("replay.finished") : labels[cursor.index]}</span>
        </div>
        <div className="replay-controls__buttons">
          <Button
            size="sm"
            variant="secondary"
            disabled={cursor.index === 0}
            onClick={() => seek(0)}
            aria-label={t("replay.start")}
          >
            |‹
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={cursor.index === 0}
            onClick={() => seek(cursor.index - 1)}
            aria-label={t("replay.previous")}
          >
            ‹
          </Button>
          <Button size="sm" onClick={togglePlay} aria-pressed={playing}>
            {t(playing ? "replay.pause" : "replay.play")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={atEnd}
            onClick={() => seek(cursor.index + 1)}
            aria-label={t("replay.next")}
          >
            ›
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={atEnd}
            onClick={() => seek(replay.frames.length - 1)}
            aria-label={t("replay.end")}
          >
            ›|
          </Button>
          <label>
            {t("replay.speed")}
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
            {t("replay.turn")}
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
            {t("replay.hands")}
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
      </div>
    </section>
  );
}
