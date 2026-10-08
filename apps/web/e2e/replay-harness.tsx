// Test-only entry: observe the real ReplayPlayer without adding globals to the product.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import type { MatchReplay } from "@aegis/shared";
import { ReplayPlayer } from "../src/replays/ReplayPlayer";
import { readReplay } from "../src/replays/files";
import { I18nProvider } from "../src/i18n";
import type { PresentationControls, PresentationProbe } from "../src/game/presentationProbe";
import { observeGateExpiry } from "../src/game/match/presentationGate";
import { presentationTelemetry } from "../src/game/presentationTelemetry";
import "../src/design/tokens.css";
import "../src/design/base.css";
import "../src/design/layout.css";
import "../src/design/primitives.css";
import "../src/replays/replays.css";

let controls: PresentationControls | undefined;
const steps: { id: string; phase: string; track?: string; batch?: string; at: number; failed: boolean }[] = [];
const expiries: string[] = [];
let board: Parameters<NonNullable<PresentationProbe["onBoard"]>>[0]["visible"] | undefined;
observeGateExpiry((expiry) => expiries.push(expiry.label));
const probe: PresentationProbe = {
  onQueue(next) {
    controls = next;
  },
  onStep(event) {
    steps.push({
      id: event.step.id,
      phase: event.phase,
      track: event.step.track,
      batch: event.batch?.batchId,
      at: event.at,
      failed: event.failed,
    });
  },
  onBoard(next) {
    board = next.visible;
  },
};
Object.assign(window, {
  replayEvidence: () => ({
    steps,
    expiries,
    board,
    idle: controls?.queue.isIdle() ?? false,
    failed: steps.filter((step) => step.failed).map((step) => step.id),
    counters: presentationTelemetry.read().counters,
  }),
});
function Harness() {
  const [replay, setReplay] = useState<MatchReplay>();
  return replay ? (
    <ReplayPlayer replay={replay} devProbe={probe} onClose={() => setReplay(undefined)} />
  ) : (
    <label>
      Open replay file
      <input
        type="file"
        aria-label="Open replay file"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            presentationTelemetry.reset();
            setReplay(await readReplay(file));
          }
        }}
      />
    </label>
  );
}
createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <Harness />
  </I18nProvider>,
);
