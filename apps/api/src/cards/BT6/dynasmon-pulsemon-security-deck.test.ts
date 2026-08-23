import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-033.js";
import "./BT6-044.js";

describe("BT6 Dynasmon and Pulsemon security deck gauntlet", () => {
  it("reveals before Recovery, then prevents a second Recovery after Pulsemon removes security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "levelFiveBase" }],
          hand: [
            { card: "BT6-044", as: "dynasmon" },
            { card: "BT6-033", as: "pulsemon" },
          ],
          security: ["BT6-034", "BT6-035", "BT6-036", "BT6-037"],
          deck: [
            { card: "BT1-095", as: "digivolutionDraw" },
            { card: "BT2-020", as: "firstRevealPick" },
            { card: "BT2-017", as: "secondRevealPick" },
            "BT1-090",
            "BT1-091",
            "BT1-092",
            "BT1-093",
            { card: "BT1-094", as: "recoveredCard" },
            { card: "BT1-096", as: "oncePerTurnSentinel" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferOptionIndex: 1,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("firstRevealPick").instanceId, s.inst("secondRevealPick").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("levelFiveBase").permanentId,
        instanceId: s.inst("dynasmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("recoveredCard").instanceId) &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("firstRevealPick").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.at(0)?.instanceId).toBe(s.inst("recoveredCard").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("oncePerTurnSentinel").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(5);

    const revealRequest = s.decisions.find(({ req }) => {
      if (req.kind !== "selectCards") return false;
      const candidates = req.options?.candidateInstanceIds ?? [];
      return candidates.includes(s.inst("firstRevealPick").instanceId);
    })?.req;
    expect(revealRequest).toBeDefined();
    expect(new Set(revealRequest!.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([s.inst("firstRevealPick").instanceId, s.inst("secondRevealPick").instanceId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("pulsemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.security.length === 3 && s.state.memory === 4 && s.state.pendingDecision === undefined,
    );

    // Dynasmon already recovered from its own digivolution cost this turn. Pulsemon's
    // later security removal gains memory, but cannot consume the sentinel for Recovery.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("oncePerTurnSentinel").instanceId,
    ]);
    assertNoLoudGap(s);
  });
});
