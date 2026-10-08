// @vitest-environment jsdom
import {
  CardInstance,
  type DecisionRequest,
  type DecisionResponse,
  type PresentationReport,
  type ServerEvent,
} from "@aegis/shared";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createArenaDemoState } from "../dev/ArenaDemo";
import { I18nProvider } from "../i18n";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { GameScreen } from "./GameScreen";
import { DEFAULT_PACING, setBasePacing, setEffectSpeed } from "./pacing";
import { presentationTelemetry } from "./presentationTelemetry";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";

// Public cost prompt from the reporter's candidate match. No private match state or tokens.
const VISIBLE = [
  ["s0-46", "BT25-083"],
  ["s0-27", "BT21-074"],
  ["s0-42", "LM-067"],
  ["s0-40", "EX7-073"],
  ["s0-9", "BT25-085"],
  ["s0-38", "EX7-071"],
  ["s0-30", "EX7-008"],
  ["s0-0", "BT25-078"],
  ["s0-10", "BT25-085"],
  ["s0-8", "EX7-071"],
  ["s0-37", "EX7-071"],
  ["s0-39", "EX7-071"],
  ["s0-53", "BT25-005"],
] as const;
const ELIGIBLE = ["s0-27", "s0-42", "s0-40", "s0-9", "s0-38", "s0-10", "s0-8", "s0-37", "s0-39"];
const EFFECT_TEXT =
  "[On Play] [When Digivolving] By placing 1 [Appmon]/[Three Musketeers] trait card from your hand or trash as any of your Digimon's bottom digivolution card, until your opponent's turn ends, their effects can't return that Digimon to hands or decks or affect it with ＜De-Digivolve＞ effects.";
const DECISION: DecisionRequest = {
  decisionId: "dec-18",
  seat: 0,
  kind: "selectCards",
  stateVersion: 111,
  promptText: "Satellamon",
  sourceCardId: "BT21-074",
  sourceInstanceId: "s0-28",
  sourcePermanentId: "perm-11",
  options: {
    candidateInstanceIds: ELIGIBLE,
    visibleInstanceIds: VISIBLE.map(([id]) => id),
    visibleCards: VISIBLE.map(([instanceId, cardId]) => ({ instanceId, cardId, artId: cardId })),
    min: 1,
    max: 1,
    differentColors: false,
    timing: "OnPlay",
    effectText: EFFECT_TEXT,
    effectKey: "BT21-074/ir-6-0",
    purpose: "cost",
  },
};
const TRIGGER: ServerEvent = {
  kind: "effectTriggered",
  seat: 0,
  sourceCardId: "BT21-074",
  sourceInstanceId: "s0-28",
  sourcePermanentId: "perm-11",
  effectKey: "BT21-074/ir-6-0",
  timing: "OnPlay",
  description: EFFECT_TEXT,
};

function controlState() {
  const state = createArenaDemoState();
  state.matchTimer = false;
  state.stateVersion = 111;
  const human = state.players[0]!;
  const cards = VISIBLE.map(([instanceId, cardId]) => {
    const card = new CardInstance();
    card.instanceId = instanceId;
    card.cardId = cardId;
    card.ownerSeat = 0;
    card.faceUp = true;
    return card;
  });
  human.hand.splice(0, human.hand.length, ...cards.slice(0, 6));
  human.handCount = 6;
  human.trash.splice(0, human.trash.length, ...cards.slice(6));
  const source = human.battleArea[0]!;
  source.permanentId = "perm-11";
  source.topCard.instanceId = "s0-28";
  source.topCard.cardId = "BT21-074";
  source.baseDP = 7000;
  source.currentDP = 7000;
  return state;
}

async function elapse(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setBasePacing(DEFAULT_PACING);
  setEffectSpeed("normal");
  presentationTelemetry.reset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setBasePacing(DEFAULT_PACING);
  setEffectSpeed("normal");
});

describe.each(["current", "sequential"] as const)(
  "Discord 1557702941106901032 candidate control: %s pacing",
  (presentationPacing) => {
    it("hands an open Satellamon unit to its choice without effectResolved, skip, or a watchdog", async () => {
      const reports: PresentationReport[] = [];
      const anchors: MatchCueAnchors = {
        board: { current: null },
        yourDeck: { current: null },
        oppDeck: { current: null },
        yourHandDock: { current: null },
        oppHandStrip: { current: null },
        yourSecurity: { current: null },
        oppSecurity: { current: null },
        permanentCenter: () => ({ x: 100, y: 100 }),
      };
      const state = controlState();
      const view = renderHook(
        ({ batches, decision }: { batches: readonly ServerBatch[]; decision?: DecisionRequest }) =>
          useMatchCues({
            state,
            batches,
            viewerSeat: 0,
            mulliganOpen: false,
            anchors,
            presentationPacing,
            decisionPending: Boolean(decision),
            decisionStateVersion: decision?.stateVersion,
            decisionSourceCardId: decision?.sourceCardId,
            onActionRejected: () => {},
            onPresentationReport: (report) => reports.push(report),
          }),
        { initialProps: { batches: [] } as { batches: readonly ServerBatch[]; decision?: DecisionRequest } },
      );
      await elapse(0);
      view.rerender({ batches: [singleServerBatch([TRIGGER], 111)], decision: DECISION });
      await elapse(0);
      expect(view.result.current.decisionAnimationsPending).toBe(presentationPacing === "sequential");
      expect(view.result.current.effectSources).toEqual(
        expect.arrayContaining([expect.objectContaining({ site: { zone: "field", permanentId: "perm-11" } })]),
      );
      await elapse(2500);
      expect(view.result.current.decisionAnimationsPending).toBe(false);
      expect(view.result.current.decisionBarrierPending).toBe(false);
      expect(presentationTelemetry.read().counters.decisionStallHits).toBe(0);
      expect(reports.some((report) => report.failed)).toBe(false);
      // The current path has no effect-unit track; the sequential path must actually
      // finish announce followed by settle while the server waits for this answer.
      const unitPhases = reports
        .filter((report) => report.track === "effectUnit")
        .map((report) => `${report.phase}:${report.stepId.replace(/-\d+$/, "")}`);
      expect(unitPhases).toEqual(
        presentationPacing === "current"
          ? []
          : [
              "queued:effect-unit-announce",
              "started:effect-unit-announce",
              "queued:effect-unit-settle",
              "finished:effect-unit-announce",
              "started:effect-unit-settle",
              "finished:effect-unit-settle",
            ],
      );
    });

    it("shows all 13 cards, disables the 4 ineligible cards, and submits the distinct hand copy", async () => {
      const state = controlState();
      const respondDecision = vi.fn<(response: DecisionResponse) => void>();
      const view = (batches: readonly ServerBatch[], decision?: DecisionRequest) => (
        <I18nProvider>
          <GameScreen
            joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
            identityColor="Purple"
            onExit={() => {}}
            presentationPacing={presentationPacing}
            demoConnection={{
              room: undefined,
              status: "connected",
              state,
              batches,
              events: batches.flatMap((batch) => batch.events),
              decision,
              acknowledgeDecision: () => {},
              respondDecision,
              error: undefined,
              sessionId: state.players[0]!.sessionId,
              roomCode: "",
            }}
          />
        </I18nProvider>
      );
      const rendered = render(view([]));
      await elapse(0);
      rendered.rerender(view([singleServerBatch([TRIGGER], 111)], DECISION));
      await elapse(2500);
      const candidates = [...document.querySelectorAll<HTMLButtonElement>(".decision-overlay__candidate")];
      expect(candidates).toHaveLength(13);
      expect(candidates.filter((candidate) => !candidate.disabled)).toHaveLength(9);
      expect(document.querySelector('[data-instance-id="s0-28"]')).toBeNull();
      const copy = candidates.find((candidate) => candidate.dataset.instanceId === "s0-27")!;
      expect(copy.disabled).toBe(false);
      const ineligible = candidates.find((candidate) => candidate.dataset.instanceId === "s0-46")!;
      expect(ineligible.disabled).toBe(true);
      fireEvent.click(ineligible);
      expect(respondDecision).not.toHaveBeenCalled();
      fireEvent.click(copy);
      fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
      expect(respondDecision).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["s0-27"] });
    });
  },
);
