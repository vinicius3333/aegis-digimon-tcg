// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import type { GameState, Seat, ServerEvent } from "@aegis/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { recordSnapshot, selectPresentedState, type StateSnapshot } from "../net/presentedState";
import { visibleBoard } from "./screen/model/visibleBoard";
import { TIMINGS } from "./timings";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";

vi.mock("../design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

function geometry(): MatchCueAnchors {
  const boardElement = document.createElement("div");
  const pile = document.createElement("div");
  vi.spyOn(boardElement, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
  vi.spyOn(pile, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 40, 80, 100));
  return {
    board: { current: boardElement },
    permanentCenter: () => ({ x: 320, y: 120 }),
    permanentStack: (permanentId) => ({ x: 320, y: 120, width: 72, height: 100.8, angle: 0, permanentId }),
    yourDeck: { current: pile },
    oppDeck: { current: pile },
    yourHandDock: { current: pile },
    oppHandStrip: { current: pile },
    yourSecurity: { current: pile },
    oppSecurity: { current: pile },
  };
}

const viewerSeat: Seat = 0;
const botSeat: Seat = 1;
const attackerId = "dev-perm-1-trident-target";

function board(stateVersion: number, suspended: boolean): GameState {
  const monodramon = {
    permanentId: attackerId,
    topCard: { instanceId: "dev-field-1-trident-target", cardId: "BT1-009", artId: "BT1-009" },
    stack: [],
    linked: [],
    isSuspended: suspended,
    currentDP: 3000,
    keywords: [],
  };
  return {
    stateVersion,
    turnSeat: botSeat,
    turnCount: 2,
    phase: "Main",
    memory: 0,
    players: [
      { seat: 0, battleArea: [], trash: [], hand: [], handCount: 5, security: [], securityCount: 5, deckCount: 40 },
      {
        seat: 1,
        battleArea: [monodramon],
        trash: [],
        hand: [],
        handCount: 5,
        security: [],
        securityCount: 5,
        deckCount: 40,
      },
    ],
  } as unknown as GameState;
}

const forcedAttack = {
  seat: botSeat,
  sourceCardId: "BT1-009",
  sourceInstanceId: "dev-field-1-trident-target",
  sourcePermanentId: attackerId,
  effectKey: "granted/[Start of Your Main Phase] This Digimon attacks./OnStartMainPhase",
  description: "[Granted] [Start of Your Main Phase] This Digimon attacks.",
  timing: "OnStartMainPhase",
};

/** Dev arena `arena-st15-trident-arm-forced-attack-text`: the server's batches at the bot's Main phase. */
const serverBatches: readonly { events: ServerEvent[]; suspended: boolean }[] = [
  {
    events: [{ kind: "phaseChanged", phase: "Main", turnSeat: botSeat, turnCount: 2 } as ServerEvent],
    suspended: false,
  },
  { events: [{ kind: "effectTriggered", ...forcedAttack } as ServerEvent], suspended: false },
  // The server suspends the attacker in a revision that carries no event of its own.
  { events: [], suspended: true },
  {
    events: [
      {
        kind: "attackDeclared",
        seat: botSeat,
        attackerPermanentId: attackerId,
        attackerCardId: "BT1-009",
        target: { kind: "player" },
      } as ServerEvent,
    ],
    suspended: true,
  },
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const probeMs = 8;

it.each(["current", "sequential"] as const)(
  "reads the granted forced-attack clause before the attack starts under %s pacing (Discord bug 1557482157012680795)",
  async (presentationPacing) => {
    const firstVersion = 40;
    const before = board(firstVersion - 1, false);
    let snapshots: readonly StateSnapshot[] = recordSnapshot([], before);
    let live = before;
    const fed: ServerBatch[] = [];
    const view = renderHook(
      ({ batches, state, taken }: { batches: readonly ServerBatch[]; state: GameState; taken: typeof snapshots }) =>
        useMatchCues({
          state,
          batches,
          snapshots: taken,
          viewerSeat,
          anchors: geometry(),
          mulliganOpen: false,
          onActionRejected: vi.fn<(reason: string) => void>(),
          presentationPacing,
        }),
      { initialProps: { batches: [...fed], state: live, taken: snapshots } },
    );
    const advance = (ms: number) => act(async () => vi.advanceTimersByTimeAsync(ms));
    await advance(0);
    serverBatches.forEach(({ events, suspended }, index) => {
      const stateVersion = firstVersion + index;
      const batch = singleServerBatch(events, stateVersion);
      fed.push({ ...batch, events: batch.events.map((event) => ({ ...event, stateVersion: stateVersion - 1 })) });
      live = board(stateVersion, suspended);
      snapshots = recordSnapshot(snapshots, live);
    });
    view.rerender({ batches: [...fed], state: live, taken: snapshots });

    let noticeAt: number | undefined;
    let announcedAt: number | undefined;
    let suspendedAt: number | undefined;
    let arrowAllowedAt: number | undefined;
    let highlightedAt: number | undefined;
    let highlightedWhileUpright = false;
    for (let elapsed = 0; elapsed <= 8_000; elapsed += probeMs) {
      const cues = view.result.current;
      const displayed = selectPresentedState({ live, snapshots, presentedStateVersion: cues.presentedStateVersion })!;
      const visible = visibleBoard({ live, displayed, viewerSeat, cues });
      const attacker = visible?.players[botSeat].battleArea.find(({ permanentId }) => permanentId === attackerId);
      const noticeShown = cues.notices.some(
        (notice) => notice.body.variant === "effect" && notice.body.description?.startsWith("[Granted]"),
      );
      if (noticeShown) noticeAt ??= elapsed;
      const highlighted = cues.effectSources.some(
        ({ site }) => site.zone === "field" && site.permanentId === attackerId,
      );
      if (highlighted) highlightedAt ??= elapsed;
      if (highlighted && attacker && !attacker.isSuspended) highlightedWhileUpright = true;
      if (cues.attackAnnouncement) announcedAt ??= elapsed;
      if (attacker?.isSuspended) suspendedAt ??= elapsed;
      if (noticeAt !== undefined && !cues.attackAwaitingCause) arrowAllowedAt ??= elapsed;
      await advance(probeMs);
    }

    expect(noticeAt).toBeDefined();
    expect(highlightedAt).toBeDefined();
    expect(highlightedWhileUpright).toBe(true);
    expect(announcedAt).toBeDefined();
    expect(suspendedAt).toBeDefined();
    expect(announcedAt! - noticeAt!).toBeGreaterThanOrEqual(TIMINGS.effectAnnounce);
    expect(suspendedAt! - noticeAt!).toBeGreaterThanOrEqual(TIMINGS.effectAnnounce);
    expect(suspendedAt! - highlightedAt!).toBeGreaterThanOrEqual(TIMINGS.effectAnnounce);
    expect(arrowAllowedAt! - noticeAt!).toBeGreaterThanOrEqual(TIMINGS.effectAnnounce);
  },
);
