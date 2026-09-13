import { useId, useRef, useState } from "react";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { DEMO_KEYWORDS, demoKeywordName } from "./arenaDemoKeywords";
import type { ArenaVisualPlaybackController } from "./arenaVisualPlayback";
import "./arenaVisualPlayer.css";

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 11a8 8 0 1 1-2.4-5.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

/** Lives over the demo toolbar, so playback never takes space from the card areas. */
export function ArenaVisualPlayer({ playback }: { playback: ArenaVisualPlaybackController }) {
  const { locale } = useTranslation();
  const portuguese = locale === "pt-BR";
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const summaryRef = useRef<HTMLButtonElement>(null);
  if (!playback.active) return null;

  const capability =
    playback.scenario.capability === "animated"
      ? portuguese
        ? "Animação compartilhada"
        : "Shared animation"
      : portuguese
        ? "Cenário de interação"
        : "Interaction scene";
  const compactCapability =
    playback.scenario.capability === "animated"
      ? portuguese
        ? "Animação"
        : "Animation"
      : portuguese
        ? "Interação"
        : "Interaction";
  const capabilityKind = playback.scenario.capability === "animated" ? "animated" : "interaction";
  const pauseLabel = portuguese ? "Pausar após esta cena" : "Pause after this scene";
  const playLabel = portuguese ? "Reproduzir keywords" : "Play keywords";
  const text = {
    title: portuguese ? "Reprodução visual de keywords" : "Visual keyword playback",
    details: portuguese ? "Detalhes da cena" : "Scene details",
    previous: portuguese ? "Keyword anterior" : "Previous keyword",
    next: portuguese ? "Próxima keyword" : "Next keyword",
    close: portuguese ? "Fechar reprodução e voltar à demo" : "Close playback and return to the demo",
    repeat: portuguese ? "Repetir esta cena" : "Replay this scene",
    select: portuguese ? "Escolher keyword" : "Choose a keyword",
    paused: portuguese
      ? "A reprodução está pausada. A cena atual termina normalmente."
      : "Playback is paused. The current scene finishes normally.",
  };

  function navigate(action: () => void) {
    setExpanded(false);
    action();
    if (expanded) requestAnimationFrame(() => summaryRef.current?.focus());
  }

  function close() {
    setExpanded(false);
    playback.controls.stop();
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".aegis-arena-demo-keywords")?.focus());
  }

  return (
    <section
      className="arena-visual-player"
      data-demo-keyword={playback.scenario.keyword}
      data-demo-index={playback.index}
      data-demo-stage={playback.stageLabel}
      data-demo-playing={playback.playing ? "true" : "false"}
      aria-label={text.title}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !expanded) return;
        event.preventDefault();
        event.stopPropagation();
        setExpanded(false);
        summaryRef.current?.focus();
      }}
    >
      <div className="arena-visual-player__bar">
        <button
          ref={summaryRef}
          type="button"
          className="arena-visual-player__summary"
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${playback.index + 1}/${playback.total} · ${playback.scenario.title} · ${capability} · ${text.details}`}
          title={playback.scenario.description}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="arena-visual-player__summary-copy" aria-live="polite" aria-atomic="true">
            <span className="arena-visual-player__title">
              <span className="arena-visual-player__count">
                {playback.index + 1}/{playback.total}
              </span>
              <strong>{playback.scenario.title}</strong>
            </span>
            <span className="arena-visual-player__capability" data-capability={capabilityKind}>
              <span className="arena-visual-player__capability-full">{capability}</span>
              <span className="arena-visual-player__capability-short">{compactCapability}</span>
              <span className="arena-visual-player__summary-description"> · {playback.scenario.description}</span>
            </span>
          </span>
          <span className="arena-visual-player__expand" aria-hidden="true">
            {expanded ? <Icons.ChevronUp size={15} /> : <Icons.ChevronDown size={15} />}
          </span>
        </button>
        <button
          type="button"
          className="arena-visual-player__button"
          aria-label={text.previous}
          title={text.previous}
          disabled={playback.index === 0}
          onClick={() => navigate(playback.controls.previous)}
        >
          <span aria-hidden="true">
            <Icons.ChevronLeft size={21} />
          </span>
        </button>
        <button
          type="button"
          className="arena-visual-player__button arena-visual-player__button--play"
          aria-label={playback.playing ? pauseLabel : playLabel}
          title={playback.playing ? pauseLabel : playLabel}
          onClick={playback.playing ? playback.controls.pause : playback.controls.start}
        >
          {playback.playing ? (
            <PauseIcon />
          ) : (
            <span aria-hidden="true">
              <Icons.Play size={19} />
            </span>
          )}
        </button>
        <button
          type="button"
          className="arena-visual-player__button"
          aria-label={text.next}
          title={text.next}
          disabled={playback.index >= playback.total - 1}
          onClick={() => navigate(playback.controls.next)}
        >
          <span aria-hidden="true">
            <Icons.ChevronRight size={21} />
          </span>
        </button>
        <button
          type="button"
          className="arena-visual-player__button arena-visual-player__button--close"
          aria-label={text.close}
          title={text.close}
          onClick={close}
        >
          <span aria-hidden="true">
            <Icons.X size={19} />
          </span>
        </button>
      </div>
      <div className="arena-visual-player__progress" aria-hidden="true">
        <span style={{ width: `${((playback.index + 1) / playback.total) * 100}%` }} />
      </div>
      {expanded ? (
        <div className="arena-visual-player__details" id={detailsId}>
          <div className="arena-visual-player__details-heading">
            <span className="arena-visual-player__capability" data-capability={capabilityKind}>
              {capability}
            </span>
            <span className="arena-visual-player__stage">{playback.stageLabel}</span>
          </div>
          <p>{playback.scenario.description}</p>
          {!playback.playing ? <p className="arena-visual-player__hint">{text.paused}</p> : null}
          <label className="arena-visual-player__select">
            <span>{text.select}</span>
            <select
              value={playback.index}
              onChange={(event) => navigate(() => playback.controls.select(Number(event.target.value)))}
            >
              {DEMO_KEYWORDS.map((keyword, index) => (
                <option key={keyword} value={index}>
                  {index + 1}/{playback.total} · {demoKeywordName(keyword)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="arena-visual-player__repeat"
            onClick={() => navigate(playback.controls.repeat)}
          >
            <RepeatIcon />
            {text.repeat}
          </button>
        </div>
      ) : null}
    </section>
  );
}
