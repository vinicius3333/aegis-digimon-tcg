import { Component, useRef, useState, type ReactNode } from "react";
import type { MatchReplay } from "@aegis/shared";
import { useTranslation } from "../i18n";
import { Icons } from "../design/icons";
import { Button } from "../design/primitives";
import { readReplay, ReplayFileError, type ReplayFileErrorCode } from "./files";
import { ReplayPlayer } from "./ReplayPlayer";
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

export function ReplaysScreen() {
  const { t } = useTranslation();
  const [replay, setReplay] = useState<MatchReplay>();
  const [error, setError] = useState<ReplayFileErrorCode>();
  const [loading, setLoading] = useState(false);
  const pending = useRef(0);
  async function open(file: File | undefined) {
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
      <Icons.PlayCircle size={48} />
      <h1>{t("replay.title")}</h1>
      <p>{t("replay.intro")}</p>
      <label className="replay-import__file">
        {t("replay.open")}
        <input
          type="file"
          accept=".aegis-replay,.json,.gz,application/json,application/gzip"
          disabled={loading}
          onChange={(event) => {
            void open(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <small>{t("replay.local")}</small>
      {loading ? <p role="status">{t("replay.loading")}</p> : null}
      {error ? <p role="alert">{t(`replay.error.${error}`)}</p> : null}
    </section>
  );
}
