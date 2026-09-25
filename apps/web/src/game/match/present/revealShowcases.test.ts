import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import type { AnimationStep, AnimationStepContext } from "../../animationQueue";
import { Side } from "../../side";
import { REVEAL_SHOWCASE_TOTAL_MS } from "../../timings";
import { CueTrack } from "../enums";
import { createPresentationGate } from "../presentationGate";
import type { DrawFlightCard } from "../types";
import { collectBatchAnnouncements } from "./announcements";
import { enqueueRevealShowcases, revealShowcasesFromEvents, type RevealShowcase } from "./revealShowcases";

const VIEWER = 0;
const OPPONENT = 1;

/** The production batch that went unseen: the opponent's P-104 revealing its top 2 cards. */
const opponentReveal: ServerEvent[] = [
  { kind: "cardRevealed", seat: OPPONENT, cardId: "BT4-109", artId: "BT4-109", sourceCardId: "P-104" },
  { kind: "cardRevealed", seat: OPPONENT, cardId: "BT17-077", artId: "BT17-077", sourceCardId: "P-104" },
];

function keys() {
  let key = 0;
  return () => (key += 1);
}

function liveContext(overrides: Partial<AnimationStepContext> = {}): AnimationStepContext & { waited: number[] } {
  const waited: number[] = [];
  return {
    waited,
    wait: async (ms: number) => {
      waited.push(ms);
    },
    cancelled: false,
    mode: "live",
    skipping: false,
    ...overrides,
  };
}

function enqueued(showcases: readonly RevealShowcase[], gate = createPresentationGate()) {
  const steps: AnimationStep[] = [];
  const shown: (RevealShowcase | null)[] = [];
  let current: RevealShowcase | null = null;
  enqueueRevealShowcases({
    showcases,
    causingEffectGate: gate,
    setRevealShowcase: (next) => {
      current = typeof next === "function" ? next(current) : next;
      shown.push(current);
    },
    enqueue: (step) => steps.push(step),
  });
  return { steps, shown };
}

describe("revealShowcasesFromEvents", () => {
  it("groups one effect's reveals into one showcase, in reveal order", () => {
    expect(revealShowcasesFromEvents(opponentReveal, VIEWER, keys())).toEqual([
      {
        key: 1,
        seat: OPPONENT,
        sourceCardId: "P-104",
        cards: [
          { cardId: "BT4-109", artId: "BT4-109" },
          { cardId: "BT17-077", artId: "BT17-077" },
        ],
      },
    ]);
  });

  it("starts a new showcase when a different effect reveals", () => {
    const showcases = revealShowcasesFromEvents(
      [...opponentReveal, { kind: "cardRevealed", seat: OPPONENT, cardId: "BT1-009", sourceCardId: "EX3-029" }],
      VIEWER,
      keys(),
    );
    expect(showcases.map((showcase) => [showcase.sourceCardId, showcase.cards.length])).toEqual([
      ["P-104", 2],
      ["EX3-029", 1],
    ]);
  });

  it("leaves the viewer's own reveals and every other event alone", () => {
    const fresh: ServerEvent[] = [
      { kind: "cardRevealed", seat: VIEWER, cardId: "BT4-109", sourceCardId: "P-104" },
      { kind: "cardsMoved", instanceIds: ["s1-35"], from: "various", to: "deckBottom", seat: OPPONENT },
    ];
    expect(revealShowcasesFromEvents(fresh, VIEWER, keys())).toEqual([]);
  });
});

describe("enqueueRevealShowcases", () => {
  it("holds the revealed cards centre-stage once the causing clause has been read", async () => {
    const gate = createPresentationGate();
    const [showcase] = revealShowcasesFromEvents(opponentReveal, VIEWER, keys());
    const { steps, shown } = enqueued([showcase!], gate);
    expect(steps.map(({ id, track }) => ({ id, track }))).toEqual([
      { id: "reveal-showcase-1", track: CueTrack.CenterStage },
    ]);

    const context = liveContext();
    const running = steps[0]!.run(context);
    await Promise.resolve();
    expect(shown).toEqual([]);
    gate.release();
    await running;

    expect(shown).toEqual([showcase, null]);
    expect(context.waited).toEqual([REVEAL_SHOWCASE_TOTAL_MS]);
  });

  it.each([
    ["a replay", { mode: "replay" as const }],
    ["a drained queue", { mode: "drain" as const }],
    ["a fast-forward", { skipping: true }],
  ])("draws nothing under %s", async (_label, overrides) => {
    const [showcase] = revealShowcasesFromEvents(opponentReveal, VIEWER, keys());
    const { steps, shown } = enqueued([showcase!]);
    await steps[0]!.run(liveContext(overrides));
    expect(shown).toEqual([]);
  });
});

function announce(fresh: readonly ServerEvent[]) {
  const flights: { side: Side; card?: DrawFlightCard }[] = [];
  const result = collectBatchAnnouncements({
    fresh,
    viewerSeat: VIEWER,
    state: undefined,
    now: 0,
    showcasePlays: true,
    attackLeadInMs: 0,
    securityReveal: undefined,
    revealOnStageRef: { current: null },
    pendingDigivolutionDrawRef: { current: new Set() },
    eventDrawCountsRef: { current: {} },
    drawPhaseWaitingRef: { current: null },
    sidePanelLookupRef: {
      current: { cardId: () => undefined, artId: () => undefined, seat: () => undefined },
    },
    sidePanelSequenceRef: { current: 0 },
    noticeSequenceRef: { current: 0 },
    securityEffectPendingRef: { current: false },
    launchDrawFlight: (side, _burst, _delayMs, card) => flights.push({ side, ...(card ? { card } : {}) }),
    launchDeckToUnderFlight: () => {},
    setHeldDrawState: () => {},
  });
  return { flights, panels: result.opened };
}

describe("collectBatchAnnouncements: reveals and public hand additions", () => {
  it("still lists the opponent's reveals in the narration panel", () => {
    expect(announce(opponentReveal).panels.map((panel) => panel.titleKey)).toEqual([
      "panel.revealedCards",
      "panel.revealedCards",
    ]);
  });

  it("flies a card taken from a reveal into the opponent's hand face-up", () => {
    const added: ServerEvent = {
      kind: "cardsMoved",
      instanceIds: ["s1-27"],
      from: "various",
      to: "hand",
      cardIds: ["BT17-077"],
      artIds: ["BT17-077"],
      seat: OPPONENT,
    };
    expect(announce([added]).flights).toEqual([
      { side: Side.Opponent, card: { cardId: "BT17-077", artId: "BT17-077" } },
    ]);
  });

  it("keeps a hidden draw a card back", () => {
    const drawn: ServerEvent = { kind: "cardsMoved", instanceIds: ["s1-40"], from: "deck", to: "hand", seat: OPPONENT };
    expect(announce([drawn]).flights).toEqual([{ side: Side.Opponent }]);
  });

  it("leaves an unnamed hand addition from anywhere but the deck to the hand watcher", () => {
    const returned: ServerEvent = {
      kind: "cardsMoved",
      instanceIds: ["s1-41"],
      from: "various",
      to: "hand",
      seat: OPPONENT,
    };
    expect(announce([returned]).flights).toEqual([]);
  });
});
