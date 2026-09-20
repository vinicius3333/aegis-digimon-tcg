import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { synchronizeDeploymentRevision, usesSlotDeploymentRouter } from "./net/deployment";
import "./design/tokens.css";
import "./design/base.css";
import "./design/layout.css";
import "./design/primitives.css";

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000] as const;

export function Startup() {
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(
    () =>
      !usesSlotDeploymentRouter({
        production: import.meta.env.PROD,
        deploymentMode: import.meta.env.VITE_AEGIS_DEPLOYMENT_MODE,
      }),
  );
  const [waitingForNetwork, setWaitingForNetwork] = useState(false);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    void synchronizeDeploymentRevision({
      bundleRevision: import.meta.env.VITE_AEGIS_REVISION,
      navigation: window.location,
    })
      .then((current) => {
        if (!cancelled && current) setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setWaitingForNetwork(true);
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
        window.setTimeout(() => {
          if (!cancelled) setAttempt((value) => value + 1);
        }, delay);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, ready]);

  if (ready) return <App />;
  return (
    <main className="startup-recovery" role="status" aria-live="polite">
      <span className="aegis-loading-mark" aria-hidden="true" />
      <h1>{waitingForNetwork ? "Reconnecting to Aegis…" : "Updating Aegis…"}</h1>
      <p>Your match is still reserved. This page will recover automatically.</p>
      {waitingForNetwork ? (
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Try now
        </button>
      ) : null}
    </main>
  );
}

const container = document.getElementById("root");
if (!container) throw new Error("#root not found");
createRoot(container).render(<Startup />);
