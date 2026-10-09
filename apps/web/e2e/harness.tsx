// Served only by the test Vite server; never imported by the product entry point.
import { createRoot } from "react-dom/client";
import { Client, type Room } from "@colyseus/sdk";
import { DECISION_CHANNEL, type DecisionRequest, type SequencedServerEvent, type GameState } from "@aegis/shared";
import { GameScreen } from "../src/game/GameScreen";
import { SEQUENTIAL_PACING_ENABLED } from "../src/features";
import { I18nProvider } from "../src/i18n";
import type { AegisJoinOptions } from "../src/net/types";
import type { PresentationControls, PresentationProbe } from "../src/game/presentationProbe";
import type { VisibleBoard } from "../src/game/screen/model/visibleBoard";
import { observeGateExpiry, type GateExpiry } from "../src/game/match/presentationGate";
import { presentationTelemetry } from "../src/game/presentationTelemetry";
import "../src/design/tokens.css";
import "../src/design/base.css";
import "../src/design/layout.css";
import "../src/design/primitives.css";

declare global {
  interface Window {
    browserTestOptions: AegisJoinOptions & { seed: number };
    browserTestMode?: "casual" | "bot";
    browserTestBotDeckId?: string;
    browserTestSnapshot: () => ReturnType<GameState["toJSON"]>;
    browserTestPresentation: () => {
      idle: boolean;
      pending: number;
      visible?: VisibleBoard;
      steps: typeof presentationSteps;
      boards: typeof boards;
      events: readonly SequencedServerEvent[];
      decisions: readonly DecisionRequest[];
      gateExpiries: readonly GateExpiry[];
      counters: ReturnType<typeof presentationTelemetry.read>["counters"];
    };
  }
}

const presentationSteps: {
  id: string;
  track: string;
  phase: string;
  at: number;
  durationMs?: number;
  failed: boolean;
  cancelled: boolean;
}[] = [];
const boards: { at: number; visible: VisibleBoard }[] = [];
const gateExpiries: GateExpiry[] = [];
const decisions: DecisionRequest[] = [];
const batches = new Map<string, readonly SequencedServerEvent[]>();
let presentationControls: PresentationControls | undefined;
let visible: VisibleBoard | undefined;
observeGateExpiry((expiry) => gateExpiries.push(expiry));
const presentationProbe: PresentationProbe = {
  onBatch(batch) {
    batches.set(batch.id, batch.events);
  },
  onQueue(controls) {
    presentationControls = controls;
  },
  onStep(event) {
    presentationSteps.push({
      id: event.step.id,
      track: event.step.track ?? "main",
      phase: event.phase,
      at: event.at,
      durationMs: event.durationMs,
      failed: event.failed,
      cancelled: event.cancelled,
    });
  },
  onBoard(board) {
    visible = board.visible;
    if (visible) boards.push({ at: performance.now(), visible });
  },
};
window.browserTestPresentation = () => ({
  idle: presentationControls?.queue.isIdle() ?? false,
  pending: presentationControls?.queue.pendingCount() ?? 0,
  visible,
  steps: presentationSteps,
  boards,
  events: [...batches.values()].flat(),
  decisions,
  gateExpiries,
  counters: presentationTelemetry.read().counters,
});
// Observe the actual connection, including the replacement created by page reload.
// The browser bridge exposes a snapshot only, never an intent sender or state setter.
for (const method of ["joinOrCreate", "create", "reconnect"] as const) {
  const original = Client.prototype[method];
  Client.prototype[method] = async function (this: Client, ...args: unknown[]) {
    const room = (await (original as Function).apply(this, args)) as Room<GameState>;
    room.onMessage<DecisionRequest>(DECISION_CHANNEL, (request) => decisions.push(request));
    window.browserTestSnapshot = () => room.state.toJSON();
    return room;
  } as typeof original;
}
createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <GameScreen
      joinOptions={window.browserTestOptions}
      identityColor="Red"
      startMode={window.browserTestMode ?? (window.browserTestOptions.devScenario ? "bot" : "casual")}
      botDeckId={window.browserTestBotDeckId}
      devProbe={presentationProbe}
      presentationPacing={SEQUENTIAL_PACING_ENABLED ? "sequential" : "current"}
      onExit={() => {}}
    />
  </I18nProvider>,
);
