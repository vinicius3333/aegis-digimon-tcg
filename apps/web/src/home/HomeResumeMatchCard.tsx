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
    <Alert className="home-resume-match" tone="info" title={t("resumeMatch.title")}>
      <p>{t("resumeMatch.copy")}</p>
      <Button size="sm" disabled={state.kind === "claiming"} onClick={() => void resume()}>
        {t("resumeMatch.action")}
      </Button>
    </Alert>
  );
}
