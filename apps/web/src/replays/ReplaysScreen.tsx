import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import type { MatchReplay } from "@aegis/shared";
import { useTranslation } from "../i18n";
import { Icons } from "../design/icons";
import { CardFull } from "../design/cards";
import { Button } from "../design/primitives";
import { readReplay, ReplayFileError, type ReplayFileErrorCode } from "./files";
import { ReplayPlayer } from "./ReplayPlayer";
import { ReplayLibraryPanel } from "./ReplayLibraryPanel";
import "./replays.css";

class ReplayRenderBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function ReplaysScreen({ onViewingChange }: { onViewingChange?: (viewing: boolean) => void }) {
  const { t } = useTranslation();
  const [replay, setReplay] = useState<MatchReplay>();
  const [error, setError] = useState<ReplayFileErrorCode>();
  const [loading, setLoading] = useState(false);
  const pending = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    onViewingChange?.(replay !== undefined);
    return () => onViewingChange?.(false);
  }, [replay, onViewingChange]);
  async function open(file: Blob | undefined) {
    if (!file) return;
    const generation = ++pending.current;
    setLoading(true);
    setError(undefined);
    try {
      const parsed = await readReplay(file);
      if (pending.current === generation) setReplay(parsed);
    } catch (cause) {
      if (pending.current === generation) setError(cause instanceof ReplayFileError ? cause.code : "invalid");
    } finally {
      if (pending.current === generation) setLoading(false);
    }
  }
  const close = () => {
    setReplay(undefined);
    setError(undefined);
  };
  if (replay)
    return (
      <ReplayRenderBoundary
        key={replay.id}
        fallback={
          <div className="replay-import">
            <p role="alert">{t("replay.error.invalid")}</p>
            <Button onClick={close}>{t("replay.openAnother")}</Button>
          </div>
        }
      >
        <ReplayPlayer replay={replay} onClose={close} />
      </ReplayRenderBoundary>
    );
  return (
    <section className="replay-import">
      <div className="replay-import__layout">
        <div className="replay-import__intro">
          <div className="replay-import__preview" aria-hidden="true">
            {["BT1-010", "BT1-029", "BT1-084"].map((cardId) => (
              <div key={cardId}>
                <CardFull cardId={cardId} width={132} zoomOnHover={false} />
              </div>
            ))}
            <span>
              <Icons.Play size={28} />
            </span>
          </div>
          <span className="replay-import__eyebrow">{t("replay.title")}</span>
          <h1>{t("replay.headline")}</h1>
          <p>{t("replay.intro")}</p>
        </div>
        <div className="replay-import__upload">
          <div
            className={`replay-import__drop${dragging ? " replay-import__drop--active" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (!loading) setDragging(true);
            }}
            onDragLeave={(event) => {
              if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)))
                setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!loading) void open(event.dataTransfer.files[0]);
            }}
          >
            <Icons.FileText size={38} />
            <h2>{t("replay.drop")}</h2>
            <Button icon={Icons.FileText} disabled={loading} onClick={() => input.current?.click()}>
              {t("replay.openAction")}
            </Button>
            <input
              ref={input}
              tabIndex={-1}
              className="aegis-sr-only"
              aria-label={t("replay.open")}
              type="file"
              accept=".aegis-replay,.json,.gz,application/json,application/gzip"
              disabled={loading}
              onChange={(event) => {
                void open(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <small>.aegis-replay · JSON · GZIP</small>
            {loading ? <p role="status">{t("replay.loading")}</p> : null}
            {error ? <p role="alert">{t(`replay.error.${error}`)}</p> : null}
          </div>
          <p className="replay-import__privacy">
            <Icons.ShieldCheck size={18} />
            <span>{t("replay.local")}</span>
          </p>
        </div>
        <ol className="replay-import__steps">
          {(["replay.download", "replay.openAction", "replay.watch"] as const).map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <strong>{t(step)}</strong>
            </li>
          ))}
        </ol>
        <ReplayLibraryPanel onOpen={open} />
      </div>
    </section>
  );
}
