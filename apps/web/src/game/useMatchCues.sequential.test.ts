// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import type { PresentationPacing } from "./presentationProbe";
import { activePacing, DEFAULT_PACING, PACING_BY_STYLE, setBasePacing } from "./pacing";
import { TIMINGS } from "./timings";

vi.mock("../design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

const VIEWER = 0;

const BOARD = {
  players: [
    {
      battleArea: [
        { permanentId: "perm-a", topCard: { instanceId: "src-a", cardId: "AD1-002" }, stack: [], currentDP: 12000 },
        { permanentId: "perm-b", topCard: { instanceId: "src-b", cardId: "BT18-015" }, stack: [], currentDP: 5000 },
      ],
      trash: [],
      hand: [],
      handCount: 5,
    },
    { battleArea: [], trash: [], hand: [], handCount: 5 },
  ],
} as unknown as GameState;

function triggered(
  sourceCardId: string,
  sourceInstanceId: string,
  effectKey: string,
): Extract<ServerEvent, { kind: "effectTriggered" }> {
  return {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId,
    sourceInstanceId,
    effectKey,
    description: "[Your Turn] When one of your other Digimon digivolves, <Draw 1>.",
    timing: "whenOneOfYoursDigivolves",
  };
}

function resolved(sourceCardId: string, sourceInstanceId: string, effectKey: string): ServerEvent {
  return { ...triggered(sourceCardId, sourceInstanceId, effectKey), kind: "effectResolved" } as ServerEvent;
}

function draw(instanceId: string): ServerEvent {
  return { kind: "cardsMoved", from: "deck", to: "hand", instanceIds: [instanceId], seat: 0 };
}

/** Two effects, each closed by the server in three batches, as the live room does. */
const CHAIN: readonly (readonly ServerEvent[])[] = [
  [triggered("AD1-002", "src-a", "a/draw")],
  [draw("drawn-a")],
  [resolved("AD1-002", "src-a", "a/draw")],
  [triggered("BT18-015", "src-b", "b/draw")],
  [draw("drawn-b")],
  [resolved("BT18-015", "src-b", "b/draw")],
];

function geometry(): MatchCueAnchors {
  const board = document.createElement("div");
  const deck = document.createElement("div");
  const hand = document.createElement("div");
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
  vi.spyOn(deck, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 400, 80, 100));
  vi.spyOn(hand, "getBoundingClientRect").mockReturnValue(new DOMRect(200, 500, 300, 80));
  return {
    board: { current: board },
    permanentCenter: () => ({ x: 120, y: 80 }),
    yourDeck: { current: deck },
    oppDeck: { current: deck },
    yourHandDock: { current: hand },
    oppHandStrip: { current: hand },
    yourSecurity: { current: null },
    oppSecurity: { current: null },
  };
}

interface ChainProps {
  fed: readonly ServerBatch[];
  decision?: { stateVersion: number };
}

function renderChain(presentationPacing: PresentationPacing) {
  const anchors = geometry();
  let version = 0;
  let batches: readonly ServerBatch[] = [];
  const view = renderHook(
    ({ fed, decision }: ChainProps) =>
      useMatchCues({
        batches: fed,
        state: BOARD,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        anchors,
        onActionRejected: vi.fn<(reason: string) => void>(),
        presentationPacing,
        decisionPending: decision !== undefined,
        decisionStateVersion: decision?.stateVersion,
      }),
    { initialProps: { fed: batches } as ChainProps },
  );
  return {
    ...view,
    /** Every batch of the chain lands in one render, the way a 13 ms server burst does. */
    feedChain() {
      for (const events of CHAIN) batches = [...batches, singleServerBatch(events, (version += 1))];
      view.rerender({ fed: batches });
    },
    /** The server asks the viewer something, raised at the revision the chain closed with. */
    askViewer() {
      view.rerender({ fed: batches, decision: { stateVersion: version } });
    },
  };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

type View = Pick<ReturnType<typeof renderChain>, "result">;

const effectClauses = (view: View) => view.result.current.notices.filter((notice) => notice.body.variant === "effect");
const clauseShown = (view: View, cardId: string) =>
  effectClauses(view).some((notice) => notice.body.variant === "effect" && notice.body.cardId === cardId);
const sourceLit = (view: View, cardId: string) =>
  view.result.current.effectSources.some((source) => source.cardId === cardId);

interface Timeline {
  firstClauseA?: number;
  firstFlight?: number;
  flightsDoneAfterA?: number;
  sourceLitB?: number;
  mostClausesAtOnce: number;
}

/** Samples the screen every 16 ms and records when each beat first shows. */
async function recordTimeline(view: View, totalMs: number): Promise<Timeline> {
  const timeline: Timeline = { mostClausesAtOnce: 0 };
  let flightSeen = false;
  for (let elapsed = 0; elapsed <= totalMs; elapsed += 16) {
    timeline.mostClausesAtOnce = Math.max(timeline.mostClausesAtOnce, effectClauses(view).length);
    if (timeline.firstClauseA === undefined && clauseShown(view, "AD1-002")) timeline.firstClauseA = elapsed;
    const flying = view.result.current.drawFlights.length > 0;
    if (flying && timeline.firstFlight === undefined) timeline.firstFlight = elapsed;
    if (flying) flightSeen = true;
    if (flightSeen && !flying && timeline.flightsDoneAfterA === undefined) timeline.flightsDoneAfterA = elapsed;
    if (timeline.sourceLitB === undefined && sourceLit(view, "BT18-015")) timeline.sourceLitB = elapsed;
    await advance(16);
  }
  return timeline;
}

beforeEach(() => {
  vi.useFakeTimers();
  setBasePacing(PACING_BY_STYLE.sequential);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setBasePacing(DEFAULT_PACING);
});

describe("sequential pacing plays one effect at a time", () => {
  it("flies an effect's draw only once its clause has been read for its announce beat", async () => {
    const view = renderChain("sequential");
    await advance(0);
    view.feedChain();
    const timeline = await recordTimeline(view, 4000);

    expect(timeline.firstClauseA).toBeDefined();
    expect(timeline.firstFlight).toBeDefined();
    expect(timeline.firstFlight! - timeline.firstClauseA!).toBeGreaterThanOrEqual(activePacing().announceMs);
  });

  it("reads the announce beat when the effect plays, so a tuned value applies without remounting", async () => {
    const view = renderChain("sequential");
    await advance(0);
    setBasePacing({ ...DEFAULT_PACING, announceMs: 2000 });
    view.feedChain();
    const timeline = await recordTimeline(view, 5000);

    expect(timeline.firstFlight! - timeline.firstClauseA!).toBeGreaterThanOrEqual(2000);
  });

  it("lights the next effect only after the previous effect's results have settled", async () => {
    const view = renderChain("sequential");
    await advance(0);
    view.feedChain();
    const timeline = await recordTimeline(view, 8000);

    expect(timeline.flightsDoneAfterA).toBeDefined();
    expect(timeline.sourceLitB).toBeDefined();
    expect(timeline.sourceLitB! - timeline.flightsDoneAfterA!).toBeGreaterThanOrEqual(activePacing().settleMs);
  });

  it("never shows two effect clauses at once", async () => {
    const view = renderChain("sequential");
    await advance(0);
    view.feedChain();
    const timeline = await recordTimeline(view, 8000);

    expect(clauseShown(view, "BT18-015")).toBe(true);
    expect(timeline.mostClausesAtOnce).toBe(1);
  });

  it("collapses the whole sequence when the viewer fast-forwards", async () => {
    const view = renderChain("sequential");
    await advance(0);
    view.feedChain();
    await advance(32);
    expect(view.result.current.presentedStateVersion).toBeDefined();

    act(() => view.result.current.skipAnimations());
    await advance(200);

    expect(view.result.current.presentedStateVersion).toBeUndefined();
    expect(view.result.current.drawFlights).toHaveLength(0);
    expect(view.result.current.decisionAnimationsPending).toBe(false);
  });

  it("keeps a prompt raised after the chain closed until the last effect has settled", async () => {
    // Beats long enough that the chain outlasts the play lead-in budget.
    setBasePacing({ ...DEFAULT_PACING, sourceHoldMs: 720, announceMs: 1100, settleMs: 700 });
    const view = renderChain("sequential");
    await advance(0);
    view.feedChain();
    view.askViewer();
    // Past the play lead-in budget, which would otherwise hand the prompt the board early.
    await advance(4500);
    expect(view.result.current.decisionAnimationsPending).toBe(true);
    expect(view.result.current.presentedStateVersion).toBeDefined();

    await advance(3000);
    expect(view.result.current.decisionAnimationsPending).toBe(false);
  });

  it("folds the chain into a recap once both effects have played", async () => {
    const view = renderChain("sequential");
    await advance(0);
    view.feedChain();
    await advance(1500);
    expect(view.result.current.resolutionStrip.entries?.map((entry) => entry.status)).toEqual(["current"]);
    await advance(8000);

    expect(view.result.current.resolutionStrip.entries).toBeNull();
    expect(view.result.current.resolutionStrip.recap?.entries.map((entry) => entry.sourceCardId)).toEqual([
      "AD1-002",
      "BT18-015",
    ]);
  });
});

describe("resumed effect results", () => {
  it.each(["queued", "already visible"] as const)(
    "waits for its %s clause to return after the last own-card dialog",
    async (whenHidden) => {
      setBasePacing(PACING_BY_STYLE.stacked);
      const anchors = geometry();
      const view = renderHook(
        ({ fed, question }: { fed: readonly ServerBatch[]; question: boolean }) =>
          useMatchCues({
            batches: fed,
            state: BOARD,
            viewerSeat: VIEWER,
            mulliganOpen: false,
            anchors,
            onActionRejected: vi.fn<(reason: string) => void>(),
            presentationPacing: "sequential",
            decisionPending: question,
            decisionSourceCardId: question ? "AD1-002" : undefined,
          }),
        { initialProps: { fed: [] as readonly ServerBatch[], question: false } },
      );
      const first = singleServerBatch([triggered("AD1-002", "src-a", "a/draw")], 1);
      if (whenHidden === "queued") act(() => view.result.current.dismissOwnEffectNotice("AD1-002"));
      view.rerender({ fed: [first], question: whenHidden === "queued" });
      await advance(600);
      expect(clauseShown(view, "AD1-002")).toBe(whenHidden === "already visible");
      if (whenHidden === "already visible") {
        act(() => view.result.current.dismissOwnEffectNotice("AD1-002"));
        view.rerender({ fed: [first], question: true });
      }
      await advance(1200);
      expect(clauseShown(view, "AD1-002")).toBe(false);
      const results = singleServerBatch([draw("drawn-a"), resolved("AD1-002", "src-a", "a/draw")], 2);
      act(() => view.result.current.releaseOwnEffectNotice("AD1-002"));
      view.rerender({ fed: [first, results], question: false });

      await advance(TIMINGS.ownEffectNoticeReturn - 1);
      expect(view.result.current.drawFlights).toHaveLength(0);
      expect(clauseShown(view, "AD1-002")).toBe(false);
      await advance(1);
      expect(clauseShown(view, "AD1-002")).toBe(true);
      expect(view.result.current.drawFlights).toHaveLength(0);
      await advance(activePacing().resumeAnnounceMs + 16);
      expect(view.result.current.drawFlights).toHaveLength(1);
      await advance(1500);
      expect(view.result.current.decisionAnimationsPending).toBe(false);
    },
  );

  it("uses a finite resume beat when its clause stayed on screen", async () => {
    setBasePacing(PACING_BY_STYLE.stacked);
    const anchors = geometry();
    const view = renderHook(
      ({ fed, question }: { fed: readonly ServerBatch[]; question: boolean }) =>
        useMatchCues({
          batches: fed,
          state: BOARD,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
          presentationPacing: "sequential",
          decisionPending: question,
          decisionSourceCardId: question ? "AD1-002" : undefined,
        }),
      { initialProps: { fed: [] as readonly ServerBatch[], question: false } },
    );
    const first = singleServerBatch([triggered("AD1-002", "src-a", "a/draw")], 1);
    view.rerender({ fed: [first], question: true });
    await advance(1800);
    expect(clauseShown(view, "AD1-002")).toBe(true);
    const results = singleServerBatch([draw("drawn-a"), resolved("AD1-002", "src-a", "a/draw")], 2);
    view.rerender({ fed: [first, results], question: false });
    await advance(activePacing().resumeAnnounceMs + 16);
    expect(view.result.current.drawFlights).toHaveLength(1);
  });

  it("lets the next own-card question open, then waits for the clause after its final answer", async () => {
    setBasePacing(PACING_BY_STYLE.stacked);
    const anchors = geometry();
    const view = renderHook(
      ({ fed, question }: { fed: readonly ServerBatch[]; question: boolean }) =>
        useMatchCues({
          batches: fed,
          state: BOARD,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
          presentationPacing: "sequential",
          decisionPending: question,
          decisionSourceCardId: question ? "AD1-002" : undefined,
        }),
      { initialProps: { fed: [] as readonly ServerBatch[], question: false } },
    );
    act(() => view.result.current.dismissOwnEffectNotice("AD1-002"));
    const first = singleServerBatch([triggered("AD1-002", "src-a", "a/draw")], 1);
    view.rerender({ fed: [first], question: true });
    await advance(1800);
    const firstAnswer = singleServerBatch([draw("first-draw")], 2);
    // The answer immediately asks again; its dialog keeps the already-read clause.
    view.rerender({ fed: [first, firstAnswer], question: true });
    await advance(activePacing().resumeAnnounceMs + 16);
    expect(view.result.current.drawFlights).toHaveLength(1);
    await advance(1500);
    expect(view.result.current.decisionAnimationsPending).toBe(false);

    const finalAnswer = singleServerBatch([draw("final-draw"), resolved("AD1-002", "src-a", "a/draw")], 3);
    act(() => view.result.current.releaseOwnEffectNotice("AD1-002"));
    view.rerender({ fed: [first, firstAnswer, finalAnswer], question: false });
    await advance(TIMINGS.ownEffectNoticeReturn - 1);
    expect(view.result.current.drawFlights).toHaveLength(0);
    await advance(1);
    expect(clauseShown(view, "AD1-002")).toBe(true);
    await advance(activePacing().resumeAnnounceMs + 16);
    expect(view.result.current.drawFlights).toHaveLength(1);
  });
});

describe("sequential pacing through a security check", () => {
  it("reads a security-played On Play clause before its same-batch cost panel and draws", async () => {
    setBasePacing(PACING_BY_STYLE.stacked);
    const state = {
      ...BOARD,
      players: [{ ...BOARD.players[0]!, trash: [{ instanceId: "discard", cardId: "BT1-009" }] }, BOARD.players[1]!],
    } as unknown as GameState;
    const security: ServerEvent = {
      ...triggered("AD1-002", "src-a", "a/security"),
      timing: "Security",
      description: "[Security] Play this card without paying the cost.",
      duringSecurityCheck: true,
    };
    const onPlay: ServerEvent = {
      ...triggered("AD1-002", "src-a", "a/onPlay"),
      timing: "OnPlay",
      description: "[On Play] By trashing 1 card from your hand, draw 1 card.",
      duringSecurityCheck: true,
    };
    const batches = [
      singleServerBatch(
        [
          {
            kind: "securityRevealed",
            seat: 0,
            revealedCardId: "AD1-002",
            attackerPermanentId: "attacker",
            hasSecurityEffect: true,
          },
        ],
        1,
      ),
      singleServerBatch([security], 2),
      singleServerBatch(
        [
          {
            kind: "cardPlayed",
            seat: 0,
            cardId: "AD1-002",
            instanceId: "src-a",
            permanentId: "perm-a",
            fromZone: "security",
          },
        ],
        3,
      ),
      singleServerBatch([{ ...security, kind: "effectResolved" } as ServerEvent], 4),
      singleServerBatch([onPlay, { kind: "cardsMoved", instanceIds: ["discard"], from: "various", to: "trash" }], 5),
      singleServerBatch([draw("drawn-a")], 6),
      singleServerBatch([{ ...onPlay, kind: "effectResolved" } as ServerEvent], 7),
      singleServerBatch([{ kind: "securityChecked", seat: 0, revealedCardId: "AD1-002", resolution: "effect" }], 8),
    ];
    const anchors = geometry();
    const view = renderHook(
      ({ fed }: { fed: readonly ServerBatch[] }) =>
        useMatchCues({
          batches: fed,
          state,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
          presentationPacing: "sequential",
        }),
      { initialProps: { fed: [] as readonly ServerBatch[] } },
    );
    await advance(0);
    view.rerender({ fed: batches });
    let clauseAt: number | undefined;
    let drawAt: number | undefined;
    for (let elapsed = 0; elapsed <= 12_000; elapsed += 16) {
      if (effectClauses(view).some((notice) => notice.body.variant === "effect" && notice.body.timing === "OnPlay"))
        clauseAt ??= elapsed;
      if (view.result.current.drawFlights.length > 0) drawAt ??= elapsed;
      await advance(16);
    }
    expect(clauseAt).toBeDefined();
    expect(drawAt).toBeDefined();
    // Samples are 16 ms apart; the clause and its draw can land between frames.
    expect(drawAt! - clauseAt!).toBeGreaterThanOrEqual(activePacing().announceMs - 16);
    expect(view.result.current.decisionAnimationsPending).toBe(false);
  });

  const ATTACK: ServerEvent = {
    kind: "attackDeclared",
    seat: 0,
    attackerPermanentId: "perm-a",
    attackerCardId: "AD1-002",
    target: { kind: "player" },
  };
  const REVEAL: ServerEvent = {
    kind: "securityRevealed",
    seat: 1,
    revealedCardId: "BT4-093",
    attackerPermanentId: "perm-a",
    hasSecurityEffect: true,
  };
  const SECURITY_EFFECT: ServerEvent = {
    kind: "effectTriggered",
    seat: 1,
    sourceCardId: "BT4-093",
    effectKey: "BT4-093/security",
    description: "[Security] <Draw 1>.",
    timing: "Security",
  };
  const OPPONENT_DRAW: ServerEvent = {
    kind: "cardsMoved",
    from: "deck",
    to: "hand",
    instanceIds: ["drawn-s"],
    seat: 1,
  };
  const CHECKED: ServerEvent = { kind: "securityChecked", seat: 1, revealedCardId: "BT4-093", resolution: "effect" };

  const WHEN_ATTACKING = { description: "[When Attacking] <Draw 1>.", timing: "whenAttacking" };
  const attackTrigger = (sourceCardId: string, sourceInstanceId: string): ServerEvent => ({
    ...triggered(sourceCardId, sourceInstanceId, `${sourceCardId}/attack`),
    ...WHEN_ATTACKING,
  });

  /**
   * Four effects, then the check they preceded, whose card has a [Security] effect of its
   * own: the server closes all of it in one burst, as in the effects lab's nested scenario.
   * The dock reads the [Security] clause only when it docks, while the later [When Attacking]
   * clauses are still queued behind the first.
   */
  const ATTACK_CHAIN: readonly (readonly ServerEvent[])[] = [
    [ATTACK],
    ...CHAIN,
    ...["AD1-002", "BT18-015"].flatMap((cardId, index) => {
      const instanceId = index === 0 ? "src-a" : "src-b";
      const trigger = attackTrigger(cardId, instanceId);
      return [[trigger], [draw(`drawn-attack-${index}`)], [{ ...trigger, kind: "effectResolved" } as ServerEvent]];
    }),
    [REVEAL, SECURITY_EFFECT],
    [OPPONENT_DRAW],
    [{ ...SECURITY_EFFECT, kind: "effectResolved" } as ServerEvent],
    [CHECKED],
  ];

  function renderAttackChain() {
    const anchors = geometry();
    const view = renderHook(
      ({ fed }: { fed: readonly ServerBatch[] }) =>
        useMatchCues({
          batches: fed,
          state: BOARD,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
          presentationPacing: "sequential",
        }),
      { initialProps: { fed: [] as readonly ServerBatch[] } },
    );
    return {
      ...view,
      feed() {
        view.rerender({ fed: ATTACK_CHAIN.map((events, index) => singleServerBatch(events, index + 1)) });
      },
    };
  }

  // A gate that runs out its ceiling fails the test on its own (test/setupGateExpiry.ts).
  it("reads each clause in server order, and breaks the shield only after the effects before it", async () => {
    const view = renderAttackChain();
    await advance(0);
    view.feed();
    const firstSeen = new Map<string, number>();
    const mark = (name: string, seen: boolean, at: number) => {
      if (seen && !firstSeen.has(name)) firstSeen.set(name, at);
    };
    for (let elapsed = 0; elapsed <= 20_000; elapsed += 16) {
      const clauses = effectClauses(view);
      for (const notice of clauses)
        if (notice.body.variant === "effect") mark(`${notice.body.cardId} ${notice.body.timing ?? ""}`, true, elapsed);
      mark("break", view.result.current.securityBreak !== null, elapsed);
      await advance(16);
    }

    const order = [...firstSeen.entries()].sort(([, a], [, b]) => a - b).map(([name]) => name);
    expect(order).toEqual([
      "AD1-002 whenOneOfYoursDigivolves",
      "BT18-015 whenOneOfYoursDigivolves",
      "AD1-002 whenAttacking",
      "BT18-015 whenAttacking",
      "break",
      "BT4-093 Security",
    ]);
    expect(view.result.current.decisionAnimationsPending).toBe(false);
  });
});

describe("current pacing keeps its own order", () => {
  it("lets the second effect's source light up while the first effect's results still play", async () => {
    const view = renderChain("current");
    await advance(0);
    view.feedChain();
    const timeline = await recordTimeline(view, 8000);

    expect(timeline.sourceLitB).toBeDefined();
    expect(timeline.firstFlight! - timeline.firstClauseA!).toBeLessThan(activePacing().announceMs);
    expect(timeline.sourceLitB! - (timeline.flightsDoneAfterA ?? Infinity)).toBeLessThan(activePacing().settleMs);
    expect(view.result.current.resolutionStrip.entries).toBeNull();
    expect(view.result.current.resolutionStrip.recap).toBeNull();
  });
});
