import { describe, expect, it } from "vitest";
import { type Seat } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-119.js";
import "../BT13/BT13-077.js";
import "../BT16/BT16-033.js";
import { handCardIds, playRevealing, selectionFloors } from "./qaRulings3.testSupport.js";

describe("P-119 Hawkmon", () => {
  it("#5292: automatic turn end after Harpymon's alternate evolution still offers inherited Hawkmon first", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-119", as: "hawkmon" }, "BT16-008"],
          hand: [{ card: "BT16-033", as: "harpymon" }, "BT16-012"],
          deck: Array(12).fill("BT1-009"),
        },
        1: { battleArea: ["BT13-077"], deck: Array(12).fill("BT1-009") },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("hawkmon").permanentId,
          instanceId: s.inst("harpymon").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await turn;
      expect(s.perm("hawkmon").topCard.cardId).toBe("BT16-033");
      expect(s.perm("hawkmon").stack.map((card) => card.cardId)).toContain("P-119");
      expect(s.state.memory).toBe(-1);
      expect(
        s.decisions.filter(({ req }) => req.kind === "optional").map(({ seat, req }) => [seat, req.sourceCardId]),
      ).toEqual([
        [0, "P-119"],
        [1, "BT13-077"],
      ]);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await turn;
    }
  });

  it.each(["no partner", "no DNA result", "Hawkmon is the top card"])(
    "#5292 negative: Craniamon acts first when Hawkmon cannot DNA (%s)",
    async (reason) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              reason === "Hawkmon is the top card" ? "P-119" : { card: "BT8-012", under: ["P-119"] },
              ...(reason === "no partner" ? [] : ["BT1-070"]),
            ],
            hand: reason === "no DNA result" ? [] : ["BT12-028"],
            deck: Array(12).fill("BT1-009"),
          },
          1: { battleArea: ["BT13-077"], deck: Array(12).fill("BT1-009") },
        },
        { autoDeclineOptional: true },
      );
      await s.ready();
      const turn = s.engine.runOneTurn();
      try {
        await advance(s.engine).waitForMainPhase(0);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await turn;
        expect(
          s.decisions.filter(({ req }) => req.kind === "optional").map(({ seat, req }) => [seat, req.sourceCardId]),
        ).toEqual([[1, "BT13-077"]]);
        expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
        expect(s.state.pendingDecision).toBeUndefined();
        assertNoLoudGap(s);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await turn;
      }
    },
  );

  it.each([0, 1] as const)("#5292: seat %i's inherited DNA is offered before opposing Craniamon", async (seat) => {
    const opponent: Seat = seat === 0 ? 1 : 0;
    const s = setupEngine({
      [seat]: {
        battleArea: [
          { card: "BT8-012", as: "host", under: ["P-119"] },
          { card: "BT1-070", as: "partner" },
        ],
        hand: [{ card: "BT12-028", as: "dna" }],
        deck: Array(12).fill("BT1-009"),
      },
      [opponent]: {
        battleArea: [{ card: "BT13-077", as: "craniamon" }],
        deck: Array(12).fill("BT1-009"),
      },
    });
    s.state.turnSeat = seat;
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(seat);
      expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision !== undefined);
      const first = s.decisions.at(-1)!;
      expect(first.seat).toBe(seat);
      expect(first.req.sourceCardId).toBe("P-119");
      expect(first.req.kind).toBe("optional");
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: first.req.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.pendingDecision?.decisionId !== first.req.decisionId && s.state.pendingDecision !== undefined,
      );
      const second = s.decisions.at(-1)!;
      expect(second.seat).toBe(opponent);
      expect(second.req.sourceCardId).toBe("BT13-077");
      expect(second.req.kind).toBe("optional");
      expect(
        s.engine.applyIntent(opponent, {
          type: "respondDecision",
          decisionId: second.req.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await turn;
      expect(s.state.players[seat]!.battleArea).toHaveLength(2);
      expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(seat, { type: "surrender" });
      await turn;
    }
  });

  it("adds a red/yellow multicolor card and Yolei Inoue, then bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-119", as: "hawkmon" }],
          deck: [
            { card: "BT11-009", as: "multicolor" },
            { card: "P-126", as: "yolei" },
            { card: "BT1-009", as: "filler" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hawkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yolei").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yolei").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("filler").instanceId);
    assertNoLoudGap(s);
  });

  it("uses the inherited End of Your Turn effect for a legal DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-036", as: "host", under: ["P-119"] },
            { card: "BT1-070", as: "partner" },
          ],
          hand: [{ card: "BT12-028", as: "dna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("dna").instanceId));
    const dna = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("dna").instanceId);
    expect(dna).toBeDefined();
    expect(dna!.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("host").instanceId, s.inst("partner").instanceId]),
    );
    assertNoLoudGap(s);
  });
});

describe("P-119 Hawkmon — KB Q&A rulings", () => {
  it("adds the one match when only a qualifying card or only a [Yolei Inoue] Tamer is revealed (Q4229)", async () => {
    const onlyMulticolor = await playRevealing("P-119", ["BT13-008", "BT1-010", "BT1-009"]);
    expect(handCardIds(onlyMulticolor)).toEqual(["BT13-008"]);
    assertNoLoudGap(onlyMulticolor);

    const onlyTamer = await playRevealing("P-119", ["P-126", "BT1-010", "BT1-009"]);
    expect(handCardIds(onlyTamer)).toEqual(["P-126"]);
    assertNoLoudGap(onlyTamer);
  });

  it("accepts both a red/yellow and a yellow/red card as the red or yellow card with 2 or more colors (Q4230)", async () => {
    for (const multicolor of ["BT13-008", "BT12-034"]) {
      const s = await playRevealing("P-119", [multicolor, "BT1-010", "BT1-009"]);
      expect(handCardIds(s)).toEqual([multicolor]);
      assertNoLoudGap(s);
    }
  });

  it("must add both cards when both targets are revealed (Q4231)", async () => {
    const s = await playRevealing("P-119", ["BT13-008", "P-126", "BT1-009"]);
    expect(handCardIds(s)).toEqual(["BT13-008", "P-126"].sort());
    expect(selectionFloors(s).every((min) => min === 1)).toBe(true);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);
  });
});
