import { useEffect, useRef, useState } from "react";
import {
  REFERENCE_CLIPS,
  frameAtTime,
  frameAtMediaTime,
  frameUrl,
  parseMotionManifest,
  type MotionReferenceManifest,
} from "./motionReferenceModel";
import "./motionReference.css";
import {
  drawViewerSequenceForSource,
  drawOpponentSequenceForSource,
  handHoverGeometryForSource,
  relativeCardGeometry,
} from "./motionGeometryModel";

const LIVE_VIEWS = [
  ["/dev/arena?mode=visual", "Campo visual · ferramentas de ativação"],
  ["/dev/arena?mode=visual&scenario=hatch", "Criação · nascimento nos dois slots"],
  ["/dev/battle?scenario=security-chain", "Batalha · sequência de segurança"],
  ["/dev/effects-lab?scenario=effects-lab-own-chain", "Efeitos · engine, fila e motion probe"],
] as const;
const BEATS = ["Preparação", "Origem", "Pico", "Anúncio", "Resultado", "Repouso"];
type Annotation = { frame: number; beat: string; text: string };

export function MotionReference() {
  const query = new URLSearchParams(window.location.search);
  const reference = /^[\w-]+$/.test(query.get("reference") ?? "") ? query.get("reference")! : "kYBHuw7ItSg";
  const comparison = /^[\w-]+$/.test(query.get("comparison") ?? "") ? query.get("comparison")! : "";
  const [liveView, setLiveView] = useState<string>(LIVE_VIEWS[0][0]);
  const [recording, setRecording] = useState(comparison);
  const [recordingId, setRecordingId] = useState(comparison);
  const [mode, setMode] = useState(comparison ? "recorded" : "live");
  return (
    <main className="motion-reference">
      <header className="motion-reference__header">
        <div>
          <span className="motion-reference__eyebrow">AEGIS / MOTION LAB</span>
          <h1>Referência de animações</h1>
          <p>
            Compare movimento, ritmo e efeitos por frame, preservando o layout e o design do Aegis: cores, tipografia,
            componentes, slots e tamanho das cartas.
          </p>
        </div>
        <a href="/dev/effects-lab">Abrir laboratório de efeitos ↗</a>
      </header>
      <div className="motion-reference__columns">
        <section aria-label="Referência em vídeo">
          <ReferencePlayer key={reference} id={reference} initialFrame={Number(query.get("frame") ?? Number.NaN)} />
        </section>
        <section className="motion-reference__comparison" aria-label="Comparação Aegis">
          <div className="motion-reference__toolbar">
            <h2>Aegis</h2>
            <label>
              Comparação
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                <option value="live">Campo ao vivo</option>
                <option value="recorded">Gravação por frame</option>
              </select>
            </label>
          </div>
          {mode === "live" ? (
            <>
              <label className="motion-reference__field">
                Cenário
                <select value={liveView} onChange={(event) => setLiveView(event.target.value)}>
                  {LIVE_VIEWS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <LiveComparison key={liveView} source={liveView} />
              <p className="motion-reference__hint">
                Use Tools / Testar para disparar as animações. No laboratório de efeitos, “Passo” avança uma entrada da
                fila; timers independentes continuam em tempo real.
              </p>
              <a href={liveView} target="_blank" rel="noreferrer">
                Abrir este cenário em tamanho completo ↗
              </a>
            </>
          ) : (
            <>
              <form
                className="motion-reference__toolbar"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (/^[\w-]+$/.test(recording)) setRecordingId(recording);
                }}
              >
                <label>
                  Gravação preparada
                  <input
                    required
                    pattern={String.raw`[\w\-]+`}
                    value={recording}
                    onChange={(event) => setRecording(event.target.value)}
                    placeholder="aegis-security"
                  />
                </label>
                <button type="submit">Carregar</button>
              </form>
              {recordingId ? (
                <ReferencePlayer
                  key={recordingId}
                  id={recordingId}
                  initialFrame={Number(query.get("comparisonFrame") ?? Number.NaN)}
                />
              ) : (
                <p className="motion-reference__hint">
                  Importe uma gravação do Aegis com{" "}
                  <code>pnpm motion:reference --input vídeo.webm --id aegis-security</code>. Os dois visores terão
                  frames decodificados e medições independentes.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function LiveComparison({ source }: { source: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setScale(element.clientWidth / 1280));
    observer.observe(element);
    setScale(element.clientWidth / 1280);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={container} className="motion-reference__live" style={{ height: 800 * scale }}>
      <iframe src={source} title="Campo Aegis ao vivo" style={{ transform: `scale(${scale})` }} />
    </div>
  );
}

function ReferencePlayer({ id, initialFrame = Number.NaN }: { id: string; initialFrame?: number }) {
  const [manifest, setManifest] = useState<MotionReferenceManifest>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/motion-reference/${encodeURIComponent(id)}/manifest.json`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Prepare a referência local para abrir os frames.");
        return parseMotionManifest(await response.json());
      })
      .then((loaded) => {
        if (loaded.id !== id) throw new Error("O manifest pertence a outra referência.");
        setManifest(loaded);
      })
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [id]);
  if (error)
    return (
      <div className="motion-reference__empty" role="alert">
        <h2>Referência indisponível</h2>
        <p>{error}</p>
        <code>pnpm motion:reference{id === "kYBHuw7ItSg" ? "" : ` --input vídeo.webm --id ${id}`}</code>
        <p>Depois da preparação, recarregue esta página.</p>
      </div>
    );
  if (!manifest) return <p role="status">Carregando índice dos frames…</p>;
  return <IndexedPlayer manifest={manifest} initialFrame={initialFrame} />;
}

function IndexedPlayer({ manifest, initialFrame }: { manifest: MotionReferenceManifest; initialFrame: number }) {
  const clips = manifest.id === "kYBHuw7ItSg" ? REFERENCE_CLIPS : [];
  const [clipId, setClipId] = useState(Number.isFinite(initialFrame) ? "all" : (clips[0]?.id ?? "all"));
  const clip = clips.find((entry) => entry.id === clipId);
  const first = clip ? frameAtTime(manifest.timestamps, clip.start) : 0;
  const last = clip ? frameAtTime(manifest.timestamps, clip.end) : manifest.timestamps.length - 1;
  const [frame, setFrame] = useState(() =>
    Number.isFinite(initialFrame)
      ? Math.max(0, Math.min(manifest.timestamps.length - 1, Math.trunc(initialFrame)))
      : first,
  );
  const [displayed, setDisplayed] = useState<{ frame: number; url: string }>();
  const [imageError, setImageError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.25);
  const [loop, setLoop] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [a, setA] = useState<number>();
  const [b, setB] = useState<number>();
  const [beat, setBeat] = useState(BEATS[1]!);
  const [text, setText] = useState("");
  const [geometryGuides, setGeometryGuides] = useState(false);
  const [drawPoseGuides, setDrawPoseGuides] = useState(false);
  const [opponentEntryGuides, setOpponentEntryGuides] = useState(false);
  const sourceGeometry = handHoverGeometryForSource(manifest);
  const sourceDrawSequence = drawViewerSequenceForSource(manifest);
  const sourceOpponentSequence = drawOpponentSequenceForSource(manifest);
  const storageKey = `motion-reference:${manifest.id}:${manifest.sourceHash ?? "legacy"}`;
  const [annotations, setAnnotations] = useState<Annotation[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      return Array.isArray(saved)
        ? saved.filter(
            (entry) =>
              Number.isInteger(entry?.frame) &&
              entry.frame >= 0 &&
              entry.frame < manifest.timestamps.length &&
              typeof entry.beat === "string" &&
              typeof entry.text === "string",
          )
        : [];
    } catch {
      return [];
    }
  });
  const video = useRef<HTMLVideoElement>(null);
  const decodedFrame = useRef(frame);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(annotations));
    } catch {
      /* Export remains available if storage is disabled. */
    }
  }, [annotations, storageKey]);

  // Keep the old image and its old identity together until the requested frame really decodes.
  useEffect(() => {
    if (playing) return;
    let active = true;
    const pending = new Image();
    pending.src = frameUrl(manifest.id, frame);
    setImageError("");
    void pending
      .decode()
      .then(() => {
        if (active) setDisplayed({ frame, url: pending.src });
      })
      .catch(() => {
        if (active) setImageError(`Não foi possível carregar o frame ${frame}. Prepare a referência novamente.`);
      });
    return () => {
      active = false;
    };
  }, [manifest.id, frame, playing]);

  useEffect(() => {
    const element = video.current;
    if (!playing || !element) return;
    element.playbackRate = rate;
    let active = true;
    let callback = 0;
    function track(time: number) {
      if (!active || !element) return;
      const next = frameAtMediaTime(manifest.timestamps, time);
      if (next > last) {
        if (loop) {
          element.currentTime = manifest.timestamps[first]!;
          decodedFrame.current = first;
          setFrame(first);
        } else {
          element.pause();
          setFrame(last);
          setPlaying(false);
          return;
        }
      } else {
        decodedFrame.current = next;
        setFrame(decodedFrame.current);
      }
    }
    function nextFrame(_now: number, metadata: VideoFrameCallbackMetadata) {
      track(metadata.mediaTime);
      if (active) callback = element!.requestVideoFrameCallback(nextFrame);
    }
    const fallback = () => track(element.currentTime);
    if (typeof element.requestVideoFrameCallback === "function")
      callback = element.requestVideoFrameCallback(nextFrame);
    else element.addEventListener("timeupdate", fallback);
    void element.play().catch(() => {
      if (active) {
        setImageError("A reprodução falhou. Use os frames ou tente reproduzir novamente.");
        setPlaying(false);
      }
    });
    return () => {
      active = false;
      element.pause();
      if (callback) element.cancelVideoFrameCallback(callback);
      element.removeEventListener("timeupdate", fallback);
    };
  }, [playing, rate, first, last, loop, manifest.timestamps]);

  function seek(next: number) {
    setPlaying(false);
    const target = Math.max(first, Math.min(last, Math.trunc(next)));
    decodedFrame.current = target;
    setFrame(target);
  }
  function togglePlay() {
    if (playing) {
      setFrame(decodedFrame.current);
      setPlaying(false);
    } else {
      const target = frame >= last ? first : frame;
      decodedFrame.current = target;
      if (video.current) video.current.currentTime = manifest.timestamps[target]!;
      setFrame(target);
      setPlaying(true);
    }
  }
  function exportNotes() {
    const report = {
      reference: manifest.id,
      sourceUrl: manifest.sourceUrl,
      sourceHash: manifest.sourceHash,
      clip: clip ?? null,
      frameCount: manifest.timestamps.length,
      sequence: sourceDrawSequence
        ? {
            ...sourceDrawSequence,
            markers: sourceDrawSequence.markers.map((marker) => ({
              ...marker,
              seconds: manifest.timestamps[marker.frame],
            })),
            light: {
              ...sourceDrawSequence.light,
              observations: sourceDrawSequence.light.observations.map((row) => ({
                ...row,
                seconds: manifest.timestamps[row.frame],
              })),
            },
          }
        : null,
      opponentSequence: sourceOpponentSequence
        ? {
            ...sourceOpponentSequence,
            markers: sourceOpponentSequence.markers.map((marker) => ({
              ...marker,
              seconds: manifest.timestamps[marker.frame],
            })),
            entry: {
              ...sourceOpponentSequence.entry,
              observations: sourceOpponentSequence.entry.observations.map((row) => ({
                ...row,
                seconds: manifest.timestamps[row.frame],
              })),
            },
          }
        : null,
      measurement:
        a !== undefined && b !== undefined
          ? { a, b, durationMs: (manifest.timestamps[b]! - manifest.timestamps[a]!) * 1000 }
          : null,
      annotations: annotations.map((entry) => ({ ...entry, seconds: manifest.timestamps[entry.frame] })),
      geometry: sourceGeometry
        ? {
            ...sourceGeometry,
            relative: relativeCardGeometry(sourceGeometry.rest, sourceGeometry.focused),
            release: {
              ...sourceGeometry.release,
              observations: sourceGeometry.release.observations.map((row) => ({
                ...row,
                seconds: manifest.timestamps[row.frame],
              })),
            },
          }
        : null,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `motion-${manifest.id}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  const shown = playing ? frame : displayed?.frame;
  const markerFrame = shown ?? frame;
  const geometry =
    sourceGeometry && (clipId === "hand-hover" || (markerFrame >= 2052 && markerFrame <= 2115))
      ? sourceGeometry
      : undefined;
  const relative = geometry ? relativeCardGeometry(geometry.rest, geometry.focused) : undefined;
  const drawSequence =
    sourceDrawSequence &&
    (clipId === "draw-viewer" ||
      (markerFrame >= sourceDrawSequence.firstFrame && markerFrame <= sourceDrawSequence.lastFrame))
      ? sourceDrawSequence
      : undefined;
  const opponentSequence =
    sourceOpponentSequence &&
    (clipId === "draw-opponent" ||
      (markerFrame >= sourceOpponentSequence.firstFrame && markerFrame <= sourceOpponentSequence.lastFrame))
      ? sourceOpponentSequence
      : undefined;
  const drawLightMaximum = drawSequence
    ? Math.max(...drawSequence.light.observations.map((row) => row.meanPositiveLuma))
    : 1;
  return (
    <div
      className="motion-reference__player"
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, select, button, a")) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          seek(frame + (event.key === "ArrowRight" ? 1 : -1));
        } else if (event.key === " ") {
          event.preventDefault();
          togglePlay();
        }
      }}
    >
      <div className="motion-reference__toolbar">
        <h2>{manifest.title}</h2>
        <span className="motion-reference__tag">
          {manifest.fps.toFixed(3)} fps · {manifest.timestamps.length.toLocaleString("pt-BR")} frames
        </span>
      </div>
      <label className="motion-reference__field">
        Trecho
        <select
          value={clipId}
          onChange={(event) => {
            setPlaying(false);
            const selected = clips.find((entry) => entry.id === event.target.value);
            setClipId(event.target.value);
            const target = selected ? frameAtTime(manifest.timestamps, selected.start) : 0;
            setFrame(target);
            decodedFrame.current = target;
          }}
        >
          <option value="all">Vídeo completo</option>
          {clips.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label} · {entry.start}s
            </option>
          ))}
        </select>
      </label>
      {clip ? <p className="motion-reference__hint">{clip.note}</p> : null}
      {opponentSequence ? (
        <div className="motion-reference__geometry" aria-label="Marcos da compra do oponente">
          <div className="motion-reference__toolbar">
            {opponentSequence.markers.map((marker) => (
              <button key={marker.frame} type="button" onClick={() => seek(marker.frame)}>
                {marker.label}
              </button>
            ))}
          </div>
          <p className="motion-reference__hint">{opponentSequence.note}</p>
          <svg
            className="motion-reference__light-envelope"
            viewBox="0 0 160 48"
            role="img"
            aria-label="Diferença medida abaixo da mão"
          >
            <path d="M10 40 H150" stroke="#a7b5c7" fill="none" />
            <polyline
              points={opponentSequence.entry.observations
                .map(
                  (row, index) =>
                    `${10 + index * 14},${40 - (row.meanAbsoluteRgb / Math.max(...opponentSequence.entry.observations.map((entry) => entry.meanAbsoluteRgb))) * 32}`,
                )
                .join(" ")}
              stroke="#85d6cf"
              strokeWidth="2"
              fill="none"
            />
          </svg>

          <div className="motion-reference__toolbar">
            <label className="motion-reference__check">
              <input
                type="checkbox"
                checked={opponentEntryGuides}
                onChange={(event) => setOpponentEntryGuides(event.target.checked)}
              />
              Guias da entrada do oponente
            </label>
            <button type="button" onClick={() => seek(opponentSequence.entry.movingFrame)}>
              Verso abaixo da mão
            </button>
            <button type="button" onClick={() => seek(opponentSequence.entry.settledFrame)}>
              Verso assentado
            </button>
          </div>
          <p className="motion-reference__hint">{opponentSequence.entry.note}</p>
        </div>
      ) : null}
      {drawSequence ? (
        <div className="motion-reference__geometry" aria-label="Marcos da compra">
          <div className="motion-reference__toolbar">
            {drawSequence.markers.map((marker) => (
              <button key={marker.frame} type="button" onClick={() => seek(marker.frame)}>
                {marker.label}
              </button>
            ))}
          </div>
          <p className="motion-reference__hint">{drawSequence.note}</p>
          <svg
            className="motion-reference__light-envelope"
            viewBox="0 0 160 48"
            role="img"
            aria-label="Intensidade medida do clarão"
          >
            <path d="M10 40 H150" stroke="#a7b5c7" fill="none" />
            <polyline
              points={drawSequence.light.observations
                .map((row, index) => `${10 + index * 20},${40 - (row.meanPositiveLuma / drawLightMaximum) * 32}`)
                .join(" ")}
              stroke="#85d6cf"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <div className="motion-reference__toolbar">
            <button type="button" onClick={() => seek(1725)}>
              Pico do clarão
            </button>
            <button type="button" onClick={() => seek(1730)}>
              Fim do clarão
            </button>
          </div>
          <p className="motion-reference__hint">{drawSequence.light.note}</p>
          <div className="motion-reference__toolbar">
            <label className="motion-reference__check">
              <input
                type="checkbox"
                checked={drawPoseGuides}
                onChange={(event) => setDrawPoseGuides(event.target.checked)}
              />
              Guias da carta e do deck
            </label>
            <button type="button" onClick={() => seek(drawSequence.pose.frame)}>
              Pose legível
            </button>
            <button type="button" onClick={() => seek(drawSequence.pose.deckFrame)}>
              Deck antes da compra
            </button>
          </div>
          <p className="motion-reference__hint">{drawSequence.pose.note}</p>
        </div>
      ) : null}
      {geometry && relative ? (
        <div className="motion-reference__geometry">
          <div className="motion-reference__toolbar">
            <label className="motion-reference__check">
              <input
                type="checkbox"
                checked={geometryGuides}
                onChange={(event) => setGeometryGuides(event.target.checked)}
              />
              Guias de duas poses
            </label>
            <button type="button" onClick={() => seek(geometry.restFrame)}>
              Ir ao repouso
            </button>
            <button type="button" onClick={() => seek(geometry.focusedFrame)}>
              Ir ao hover
            </button>
          </div>
          <p className="motion-reference__hint">{geometry.note}</p>
          <output aria-label="Geometria relativa da carta">
            Escala {relative.scaleX.toFixed(2)}× · subida local {relative.localLift.toFixed(3)} alturas · incerteza ±
            {geometry.uncertaintyPx} px
          </output>
          <p className="motion-reference__hint">
            As guias comparam repouso e hover; não rastreiam os frames intermediários.
          </p>
          <div className="motion-reference__toolbar">
            <button type="button" onClick={() => seek(geometry.release.lastFocusedFrame)}>
              Antes de sair do hover
            </button>
            <button type="button" onClick={() => seek(geometry.release.restingFrame)}>
              Após sair do hover
            </button>
          </div>
          <svg
            className="motion-reference__light-envelope"
            viewBox="0 0 160 48"
            role="img"
            aria-label="Correlação das poses ao sair do hover"
          >
            <path d="M 10 40 H 150" stroke="#607d89" fill="none" />
            <polyline
              points={geometry.release.observations
                .map((row, index) => `${10 + index * 23},${40 - row.focusedCorrelation * 32}`)
                .join(" ")}
              stroke="#78e0cf"
              strokeWidth="2"
              fill="none"
            />
            <polyline
              points={geometry.release.observations
                .map((row, index) => `${10 + index * 23},${40 - row.restingCorrelation * 32}`)
                .join(" ")}
              stroke="#f3c76e"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <p className="motion-reference__hint">
            Correlação da arte: verde para a pose ampliada e âmbar para a pose em repouso. As linhas comparam imagens
            nas duas posições; não representam o caminho da carta.
          </p>
          <p className="motion-reference__hint">{geometry.release.note}</p>
        </div>
      ) : null}
      <div
        className="motion-reference__viewport"
        style={{ aspectRatio: manifest.width / manifest.height }}
        tabIndex={0}
        role="group"
        aria-label="Visor de frames. Setas navegam; espaço reproduz."
      >
        <div style={{ width: `${zoom * 100}%`, position: "relative" }}>
          <video
            ref={video}
            src={`/motion-reference/${manifest.id}/${manifest.videoFile ?? "reference.mp4"}`}
            muted
            playsInline
            preload="metadata"
            hidden={!playing}
            onEnded={() => {
              if (loop) {
                if (video.current) {
                  video.current.currentTime = manifest.timestamps[first]!;
                  void video.current.play().catch(() => setPlaying(false));
                }
              } else {
                setFrame(last);
                setPlaying(false);
              }
            }}
          />
          {!playing && displayed ? (
            <img
              src={displayed.url}
              alt={`Frame ${displayed.frame} da referência ${manifest.title}`}
              data-reference-frame={displayed.frame}
            />
          ) : null}
          {opponentSequence && opponentEntryGuides ? (
            <svg
              className="motion-reference__geometry-guides"
              viewBox={`0 0 ${manifest.frameWidth} ${manifest.frameHeight}`}
              aria-hidden="true"
              data-geometry-guides="opponent-entry"
            >
              <rect
                {...opponentSequence.entry.moving}
                fill="none"
                stroke="#85d6cf"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <rect
                {...opponentSequence.entry.settled}
                fill="none"
                stroke="#ffb35c"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <rect
                {...opponentSequence.entry.region}
                fill="none"
                stroke="#a7b5c7"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : null}
          {drawSequence && drawPoseGuides ? (
            <svg
              className="motion-reference__geometry-guides"
              viewBox={`0 0 ${manifest.frameWidth} ${manifest.frameHeight}`}
              aria-hidden="true"
              data-geometry-guides="draw-pose"
            >
              <rect
                {...drawSequence.pose.face}
                fill="none"
                stroke="#85d6cf"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <rect
                {...drawSequence.pose.deck}
                fill="none"
                stroke="#ffb35c"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : null}
          {geometry && geometryGuides ? (
            <svg
              className="motion-reference__geometry-guides"
              viewBox={`0 0 ${manifest.frameWidth} ${manifest.frameHeight}`}
              aria-hidden="true"
              data-geometry-guides="hand-hover"
            >
              <rect {...geometry.rest} fill="none" stroke="#6de3f0" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <text x={geometry.rest.x} y={geometry.rest.y - 7} fill="#6de3f0" fontSize="16">
                Repouso · #{geometry.restFrame}
              </text>
              <rect
                {...geometry.focused}
                fill="none"
                stroke="#ffb35c"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <text x={geometry.focused.x} y={geometry.focused.y - 7} fill="#ffb35c" fontSize="16">
                Hover · #{geometry.focusedFrame}
              </text>
            </svg>
          ) : null}
        </div>
      </div>
      <div className="motion-reference__readout">
        <output>
          f{shown ?? "…"} · {shown !== undefined ? `${manifest.timestamps[shown]!.toFixed(6)} s` : "Decodificando…"}
        </output>
        {!playing && displayed?.frame !== frame ? <span role="status">Decodificando f{frame}…</span> : null}
        {manifest.sourceUrl ? (
          <a href={manifest.sourceUrl} target="_blank" rel="noreferrer">
            Vídeo original ↗
          </a>
        ) : null}
      </div>
      {imageError ? <p role="alert">{imageError}</p> : null}
      <input
        className="motion-reference__scrubber"
        aria-label="Frame da referência"
        type="range"
        min={first}
        max={last}
        step={1}
        value={frame}
        onChange={(event) => seek(Number(event.target.value))}
      />
      <div className="motion-reference__toolbar">
        <button onClick={() => seek(first)} aria-label="Primeiro frame">
          ⏮
        </button>
        <button onClick={() => seek(frame - 1)} disabled={frame <= first} aria-label="Frame anterior">
          ← 1f
        </button>
        <button onClick={togglePlay} aria-pressed={playing}>
          {playing ? "Pausar" : "Reproduzir"}
        </button>
        <button onClick={() => seek(frame + 1)} disabled={frame >= last} aria-label="Próximo frame">
          1f →
        </button>
        <button onClick={() => seek(last)} aria-label="Último frame">
          ⏭
        </button>
        <label>
          Velocidade
          <select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
            {[0.1, 0.25, 0.5, 1].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
        <label>
          Zoom
          <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
            {[1, 1.5, 2, 3].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
        <label className="motion-reference__check">
          <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} /> Loop
        </label>
      </div>
      <div className="motion-reference__toolbar">
        <label>
          Ir ao frame
          <input
            aria-label="Ir ao frame"
            type="number"
            min={first}
            max={last}
            value={frame}
            onChange={(event) => {
              if (event.target.value !== "") seek(Number(event.target.value));
            }}
          />
        </label>
        <button onClick={() => setA(markerFrame)}>Marcar A</button>
        <button onClick={() => setB(markerFrame)}>Marcar B</button>
        <output aria-label="Medição entre frames">
          A {a ?? "—"} → B {b ?? "—"}
          {a !== undefined && b !== undefined
            ? ` · ${((manifest.timestamps[b]! - manifest.timestamps[a]!) * 1000).toFixed(1)} ms`
            : ""}
        </output>
      </div>
      <details className="motion-reference__notes">
        <summary>Anotações por frame · {annotations.length}</summary>
        <form
          className="motion-reference__toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            setAnnotations((previous) =>
              [...previous.filter((entry) => entry.frame !== markerFrame), { frame: markerFrame, beat, text }].sort(
                (left, right) => left.frame - right.frame,
              ),
            );
            setText("");
          }}
        >
          <label>
            Momento
            <select value={beat} onChange={(event) => setBeat(event.target.value)}>
              {BEATS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="motion-reference__note-input">
            Observação
            <input value={text} onChange={(event) => setText(event.target.value)} maxLength={600} />
          </label>
          <button type="submit">Anotar f{markerFrame}</button>
        </form>
        <ul>
          {annotations.map((entry) => (
            <li key={entry.frame}>
              <button
                onClick={() => {
                  setPlaying(false);
                  setClipId("all");
                  setFrame(entry.frame);
                  decodedFrame.current = entry.frame;
                }}
              >
                f{entry.frame} · {entry.beat}
              </button>
              <span>{entry.text}</span>
              <button
                aria-label={`Remover anotação f${entry.frame}`}
                onClick={() => setAnnotations((previous) => previous.filter((note) => note.frame !== entry.frame))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </details>
      <div className="motion-reference__toolbar">
        <button onClick={exportNotes}>Exportar medições e notas</button>
        <a href={`/dev/motion-reference?reference=${manifest.id}&frame=${markerFrame}`}>Link deste frame</a>
      </div>
      <p className="motion-reference__hint">
        Frames pausados são imagens decodificadas, sem interpolação. Reprodução usa o vídeo; os visores têm relógios
        independentes. A navegação disponível não significa que todos os frames foram revisados.
      </p>
    </div>
  );
}
