import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-030.js";
import "./BT18-008.js";

describe("BT18-030 Candlemon", () => {
  it("reveals three and adds a matching Witchelny card while returning the rest to deck bottom", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand" },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          actions: [{ kind: "Prevent", cost: { target: { filter: { position: "top" } } } }],
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-030", as: "candle" }],
          deck: [{ card: "BT18-036" }, { card: "BT1-048" }, { card: "BT1-010" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candle").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT18-036"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-036")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-048")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-010");
  });

  it("inherits once-per-turn protection for a yellow Data or Witchelny host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "host", under: ["BT18-030"] }],
          security: ["BT1-048", "BT1-056"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("naturally protects the inherited host from an opponent's deletion effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", dp: 1000, as: "host", under: ["BT18-030"] }],
          security: ["BT1-048", "BT1-056"],
        },
        1: { hand: [{ card: "BT18-008", as: "goblimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const hostId = s.perm("host").permanentId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-008"));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not protect the inherited host from its controller's effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "host", under: ["BT18-030"] }],
          security: ["BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});

describe("BT18-030 Candlemon — KB Q&A rulings", () => {
  // Wizardmon is both a yellow [Data] card and a [Witchelny] card, while Mistymon is only
  // [Witchelny]: adding the most cards means Mistymon fills the [Witchelny] slot.
  it.fails("must add as many revealed matching cards to the hand as possible (Q2953)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT18-030", as: "candlemon" }],
        deck: [
          { card: "BT18-036", as: "wizardmon" },
          { card: "BT18-039", as: "mistymon" },
          { card: "BT1-009", as: "nonMatch" },
        ],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candlemon").instanceId })).toEqual({
      ok: true,
    });
    for (let slot = 0; slot < 2; slot += 1) {
      await settle(() => s.state.pendingDecision !== undefined || s.state.players[0]!.hand.length === 2);
      if (s.state.pendingDecision === undefined) break;
      const selection = s.decisions.at(-1)!.req;
      const candidates = selection.options?.candidateInstanceIds ?? [];
      const respond = (instanceIds: string[]) =>
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "selectCards", instanceIds },
        });

      expect(selection.options?.min).toBe(1);
      expect(respond([]).ok).toBe(false);
      const wizardmonId = s.inst("wizardmon").instanceId;
      const greedyPick = candidates.includes(wizardmonId) ? wizardmonId : candidates[0]!;
      const greedyResult = respond([greedyPick]);
      const accepted = greedyResult.ok ? greedyResult : respond([candidates.find((id) => id !== greedyPick)!]);
      expect(accepted).toEqual({ ok: true });
    }
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("wizardmon").instanceId, s.inst("mistymon").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonMatch").instanceId]);
  });
});
