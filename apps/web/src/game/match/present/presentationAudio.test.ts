import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase, type GameState } from "@aegis/shared";
import type { MatchCues } from "../types";
import { soundsForPresentation, takeNewPresentationSounds, securityOutcomeSound } from "./presentationAudio";
import { SecurityBreakPhase } from "../enums";
import { Side } from "../../side";

function cues(patch: Partial<MatchCues> = {}): MatchCues {
  return {
    zoneShowcase: null,
    permanentBursts: new Map(),
    attackAnnouncement: null,
    securityBreak: null,
    securityClash: null,
    fieldClash: null,
    combatImpactIds: new Set(),
    deleteBursts: [],
    heldStackStrips: new Map(),
    effectSources: [],
    deckRiffles: new Map(),
    securityFlights: new Map(),
    drawFlights: [],
    revealShowcase: null,
    dpPulses: new Map(),
    freezePulses: new Map(),
    unsuspendSweep: null,
    phaseBanner: null,
    notices: [],
    sidePanels: [],
    ...patch,
  } as unknown as MatchCues;
}
describe("painted presentation audio", () => {
  it("plays public play once across showcase, landing, and repeated commits", () => {
    const seen = new Set<string>();
    const showcase = {
      key: 42,
      cardId: "BT1-010",
      seat: 1 as const,
      mine: false,
      kind: "play" as const,
      color: "Red" as const,
    };
    const first = takeNewPresentationSounds(soundsForPresentation(cues({ zoneShowcase: showcase })), seen);
    expect(first).toMatchObject([{ kind: "cardPlay", details: { cost: getCardDefinition("BT1-010")?.playCost } }]);
    const landing = cues({
      permanentBursts: new Map([
        ["p1", { key: 42, permanentId: "p1", variant: "play", color: "Red", inBreeding: false }],
      ]),
    });
    expect(takeNewPresentationSounds(soundsForPresentation(landing), seen)).toEqual([]);
    expect(
      takeNewPresentationSounds(soundsForPresentation(cues({ zoneShowcase: { ...showcase, key: 43 } })), seen),
    ).toHaveLength(1);
  });
  it("reads evolution source and target levels from the public physical stack after later updates", () => {
    const state = {
      players: [
        {
          battleArea: [
            {
              permanentId: "p1",
              stack: [{ cardId: "BT1-010" }, { cardId: "BT1-015" }],
              topCard: { cardId: "BT1-020" },
            },
          ],
        },
      ],
    } as unknown as GameState;
    const result = soundsForPresentation(
      cues({ zoneShowcase: { key: 9, cardId: "BT1-015", seat: 0, mine: true, kind: "digivolve", color: "Red" } }),
      state,
    );
    expect(result).toMatchObject([{ kind: "digivolve", details: { sourceLevel: 3, targetLevel: 4 } }]);
  });
  it("separates top stripping, source trash, hand trash and field deletion", () => {
    const result = soundsForPresentation(
      cues({
        deleteBursts: [
          { key: 1, x: 0, y: 0, stackStrip: true, stackStripKind: "top" },
          { key: 2, x: 0, y: 0, stackStrip: true, stackStripKind: "source" },
          { key: 3, x: 0, y: 0 },
        ],
        sidePanels: [
          {
            id: "discard",
            titleKey: "panel.discardedCards",
            side: Side.Viewer,
            cards: [],
            ordered: false,
            createdAt: 0,
          },
        ],
      }),
    );
    expect(result.map((item) => item.kind)).toEqual(["deDigivolve", "sourceTrash", "delete", "handTrash"]);
  });
  it("waits for actual shield fracture and impact, not shield arming or the battle arrow", () => {
    const shield = { key: 7, seat: 0 as const, side: Side.Viewer, seed: 1 };
    const fieldClash = {
      key: 5,
      attacker: { permanentId: "a" },
      defender: { permanentId: "b" },
      loserPermanentIds: [],
    } as unknown as MatchCues["fieldClash"];
    expect(
      soundsForPresentation(cues({ securityBreak: { ...shield, phase: SecurityBreakPhase.Arm }, fieldClash })),
    ).toEqual([]);
    const sounded = takeNewPresentationSounds(
      soundsForPresentation(
        cues({
          securityBreak: { ...shield, phase: SecurityBreakPhase.Break },
          fieldClash,
          combatImpactIds: new Set(["a", "b"]),
        }),
      ),
      new Set(),
    );
    expect(sounded.map((item) => item.kind)).toEqual(["securityHit", "impact"]);
  });
  it("keeps geometry-owned field focus out of the generic activation fanout", () => {
    const source = {
      key: 1,
      seat: 0 as const,
      cardId: "BT1-010",
      itemId: "clause",
      site: { zone: "field" as const, permanentId: "p1" },
    };
    const notice = {
      id: "clause",
      side: Side.Viewer,
      fromSecurity: false,
      createdAt: 0,
      body: { variant: "effect" as const, cardId: "BT1-010" },
    };
    expect(soundsForPresentation(cues({ effectSources: [source], notices: [notice] }))).toEqual([]);
    expect(soundsForPresentation(cues({ notices: [notice] }))).toMatchObject([{ kind: "effectActivate" }]);
    expect(
      soundsForPresentation(
        cues({ effectSources: [{ ...source, site: { zone: "hand", instanceId: "i1" } }], notices: [notice] }),
      ),
    ).toMatchObject([{ kind: "effectActivate" }]);
  });
  it("covers movement, draw, reveal, shuffle, recovery, modifiers, restrictions, grouping and end turn", () => {
    const result = soundsForPresentation(
      cues({
        permanentBursts: new Map([
          [
            "p1",
            { key: 1, permanentId: "p1", variant: "play", color: "Blue", inBreeding: false, moveFromBreeding: true },
          ],
          ["p2", { key: 2, permanentId: "p2", variant: "hatch", color: "Blue", inBreeding: true }],
        ]),
        drawFlights: [{ key: 3, x: 0, y: 0, dx: 0, dy: 0, duration: 100 }],
        deckRiffles: new Map([["0:deck", 4]]),
        securityFlights: new Map([[5, 0]]),
        revealShowcase: { key: 6, seat: 1, cards: [{ cardId: "BT1-010" }], eventIndices: [0] },
        dpPulses: new Map([
          ["p1", { key: 7, permanentId: "p1", kind: "buff", from: 1000, to: 2000 }],
          ["p2", { key: 8, permanentId: "p2", kind: "debuff", from: 2000, to: 1000 }],
        ]),
        freezePulses: new Map([["p1", { key: 9, permanentId: "p1", kind: "cannotAttack" }]]),
        phaseBanner: { key: 10, phase: Phase.End, labelKey: "game.phaseBanner.end", side: Side.Viewer },
        notices: [
          {
            id: "group",
            side: Side.Viewer,
            fromSecurity: false,
            createdAt: 0,
            body: { variant: "keyword", keyword: "digiXros", cardId: "BT1-010" },
          },
        ],
      }),
    );
    expect(new Set(result.map((item) => item.kind))).toEqual(
      new Set([
        "move",
        "hatch",
        "draw",
        "shuffle",
        "recover",
        "reveal",
        "buff",
        "debuff",
        "freeze",
        "endTurn",
        "group",
      ]),
    );
  });
  it("sounds security battle and destruction at their scene clock, preserving a late zero-delay outcome", () => {
    const scene = { key: 6, resolution: "pending", revealed: { cardId: "BT1-010", side: Side.Opponent } } as const;
    expect(securityOutcomeSound(scene)).toBeNull();
    expect(securityOutcomeSound({ ...scene, resolution: "battle", outcomeAtMs: 0 })).toMatchObject({
      kind: "impact",
      delayMs: 0,
    });
    const destruction = securityOutcomeSound({ ...scene, cause: "destruction" });
    expect(destruction?.kind).toBe("delete");
    expect(destruction!.delayMs).toBeGreaterThan(0);
  });
  it("bounds dedupe memory across long matches", () => {
    const seen = new Set<string>();
    takeNewPresentationSounds(
      Array.from({ length: 1000 }, (_, index) => ({ id: String(index), kind: "draw" as const })),
      seen,
    );
    expect(seen.size).toBe(512);
  });
});
