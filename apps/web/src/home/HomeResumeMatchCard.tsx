import { useEffect, useState } from "react";
import { Alert, Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import type { ResumableMatch } from "@/net/activeMatch/ResumableMatch";
import { claimActiveMatch, findActiveMatch } from "@/net/client";
import { loadReconnectSession, saveReconnectSession } from "@/net/reconnectSession";

type HomeResumeMatchCardParams = {
  onResume: () => void;
};

type ResumeState = { kind: "idle" } | { kind: "claiming" } | { kind: "failed" };

export function HomeResumeMatchCard({ onResume }: HomeResumeMatchCardParams) {
  const { t } = useTranslation();
  const [match, setMatch] = useState<ResumableMatch>();
  const [state, setState] = useState<ResumeState>({ kind: "idle" });

  useEffect(() => {
    if (loadReconnectSession()) {
      return;
    }
    let cancelled = false;
    void findActiveMatch()
      .catch(() => undefined)
      .then((found) => {
        if (!cancelled) setMatch(found);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!match) {
    return null;
  }
  if (state.kind === "failed") {
    return <Alert tone="warning">{t("resumeMatch.failed")}</Alert>;
  }

  const resume = async () => {
    setState({ kind: "claiming" });
    const session = await claimActiveMatch(match).catch(() => undefined);
    if (!session) {
      setState({ kind: "failed" });
      return;
    }
    saveReconnectSession(session);
    onResume();
  };

  return (
    <section className="home-card home-resume-match" aria-labelledby="home-resume-match-title">
      <span className="home-resume-match__pulse" aria-hidden="true" />
      <div className="home-resume-match__text">
        <strong id="home-resume-match-title">{t("resumeMatch.title")}</strong>
        <span>{t("resumeMatch.copy")}</span>
      </div>
      <Button size="sm" disabled={state.kind === "claiming"} onClick={() => void resume()}>
        {t("resumeMatch.action")}
      </Button>
    </section>
  );
}
