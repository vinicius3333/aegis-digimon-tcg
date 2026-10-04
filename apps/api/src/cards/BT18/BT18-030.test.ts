import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-030.js";
import "./BT18-008.js";

describe("BT18-030 Candlemon", () => {
  it.each(["EX13-037", "BT23-035", "BT18-040", "AD1-017", "BT19-041", "BT6-044"])(
    "Discord 1556041043550408755: offers %s in the yellow Data selection, then asks separately for Witchelny",
    async (dynasmon) => {
      // Nom vs Sweet JP, cbd3a09b at 13:39 UTC: EX13-037, BT18-030, BT19-036.
      const s = setupEngine({
        0: {
          hand: [{ card: "BT18-030", as: "candlemon" }],
          deck: [
            { card: dynasmon, as: "dynasmon" },
            { card: "BT18-030", as: "revealed-candlemon" },
            { card: "BT19-036", as: "wizardmon" },
          ],
        },
      });
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candlemon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision !== undefined);
      const selection = s.decisions.at(-1)!.req;
      expect(selection.kind).toBe("selectCards");
      const dynasmonId = s.inst("dynasmon").instanceId;
      const candlemonId = s.inst("revealed-candlemon").instanceId;
      const wizardmonId = s.inst("wizardmon").instanceId;
      expect(selection.options?.visibleCards?.map(({ cardId }) => cardId)).toEqual([dynasmon, "BT18-030", "BT19-036"]);
      expect(selection.options?.candidateInstanceIds).toEqual([dynasmonId, candlemonId, wizardmonId]);
      expect(selection.options?.effectTextPart).toBe("Add 1 yellow card with the [Data] trait");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }).ok,
      ).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "selectCards", instanceIds: [dynasmonId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== selection.decisionId);
      const witchelny = s.decisions.at(-1)!.req;
      expect(witchelny.kind).toBe("selectCards");
      expect(witchelny.options?.candidateInstanceIds).toEqual([wizardmonId]);
      expect(witchelny.options?.visibleCards).toEqual(selection.options?.visibleCards);
      expect(witchelny.options?.effectTextPart).toBe("1 card with the [Witchelny] trait among them to the hand.");
      for (const id of [dynasmonId, candlemonId]) {
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: witchelny.decisionId,
            response: { kind: "selectCards", instanceIds: [id] },
          }).ok,
        ).toBe(false);
      }
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: witchelny.decisionId,
          response: { kind: "selectCards", instanceIds: [wizardmonId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 2);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([dynasmon, "BT19-036"]);
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT18-030"]);
    },
  );

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
          deck: [{ card: "BT18-039" }, { card: "BT1-048" }, { card: "BT1-010" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candle").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT18-039"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-039")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-048")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-010");
  });

  it("Discord 1556041043550408755: permits a dual-category card in the Data slot without counting it twice (Q1050)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-030", as: "candlemon" }],
          deck: [
            { card: "EX13-037", as: "dynasmon" },
            { card: "BT18-030", as: "revealed-candlemon" },
            { card: "BT19-036", as: "wizardmon" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candlemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    const data = s.decisions.at(-1)!.req;
    expect(data.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: data.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("wizardmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.decisions.at(-1)!.req;
    expect(order.options?.effectTextPart).toBeUndefined();
    expect(order.options?.candidateInstanceIds).toEqual([
      s.inst("dynasmon").instanceId,
      s.inst("revealed-candlemon").instanceId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: {
          kind: "orderCards",
          order: [s.inst("revealed-candlemon").instanceId, s.inst("dynasmon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT19-036"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT18-030", "EX13-037"]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  it("Discord 1556041043550408755: permits the Witchelny assignment when the only Data card fits both categories (Q1985)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-030", as: "candlemon" }],
          deck: [
            { card: "BT19-036", as: "wizardmon" },
            { card: "BT18-039", as: "mistymon" },
            { card: "BT1-009", as: "nonMatch" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candlemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    const selection = s.decisions.at(-1)!.req;
    expect(selection.kind).toBe("selectCards");
    expect(selection.options?.min).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== selection.decisionId);
    const witchelny = s.decisions.at(-1)!.req;
    expect(witchelny.kind).toBe("selectCards");
    expect(witchelny.options?.candidateInstanceIds).toEqual([s.inst("wizardmon").instanceId]);
    expect(witchelny.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: witchelny.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("mistymon").instanceId] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: witchelny.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: witchelny.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("wizardmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.decisions.at(-1)!.req.decisionId,
        response: { kind: "orderCards", order: [s.inst("mistymon").instanceId, s.inst("nonMatch").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT19-036"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT18-039", "BT1-009"]);
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
  // Sirenmon only fits the yellow [Data] slot and Mistymon only fits the [Witchelny] slot, so
  // adding as many cards as possible means both must go to the hand. A card that fits both slots
  // may count toward either one (Q1050), so this ruling is checked without such a card.
  it("must add as many revealed matching cards to the hand as possible (Q2953)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT18-030", as: "candlemon" }],
        deck: [
          { card: "BT1-057", as: "sirenmon" },
          { card: "BT18-039", as: "mistymon" },
          { card: "BT1-009", as: "nonMatch" },
        ],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candlemon").instanceId })).toEqual({
      ok: true,
    });
    for (const alias of ["sirenmon", "mistymon"]) {
      await settle(() => s.state.pendingDecision !== undefined);
      const selection = s.decisions.at(-1)!.req;
      expect(selection.kind).toBe("selectCards");
      expect(selection.options?.min).toBe(1);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }).ok,
      ).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "selectCards", instanceIds: [s.inst(alias).instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== selection.decisionId);
    }
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("sirenmon").instanceId, s.inst("mistymon").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonMatch").instanceId]);
  });
});
