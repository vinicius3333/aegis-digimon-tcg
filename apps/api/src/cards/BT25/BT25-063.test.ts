import { digivolutionRequirementsFor, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT25-063.js";

const CARD_ID = "BT25-063";

describe("BT25-063 Commandramon", () => {
  it("supports both cost-0 alternate requirements: exact Missimon name and level 2 ACCEL", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(
      expect.arrayContaining([
        { names: ["Missimon"], cost: 0, isAlternate: true },
        { level: 2, traits: ["ACCEL"], cost: 0, isAlternate: true },
      ]),
    );
    for (const [base, alias] of [
      ["EX4-001", "blueMissimon"],
      ["BT20-004", "greenAccel"],
    ] as const) {
      const s = setupEngine({
        0: { breeding: { card: base, as: alias }, hand: [{ card: CARD_ID, as: "command" }], deck: ["BT1-009"] },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("command").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(alias).topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { breeding: { card: "BT1-001", as: "plain" }, hand: [{ card: CARD_ID, as: "command" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plain").permanentId,
        instanceId: invalid.inst("command").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("pays the ordinary black level-2 evolution cost from a non-alternate source", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT11-005", as: "blackBase" }, hand: [{ card: CARD_ID, as: "command" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackBase").permanentId,
        instanceId: s.inst("command").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackBase").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("pays the ordinary purple level-2 evolution cost from a non-alternate source", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT10-006", as: "purpleBase" }, hand: [{ card: CARD_ID, as: "command" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleBase").permanentId,
        instanceId: s.inst("command").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleBase").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("On Play adds a Chaosmon-name card and returns the ordered rest to deck top", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "command" }],
          deck: [
            { card: "BT4-090", as: "chaosmon" },
            { card: "BT1-009", as: "rest1" },
            { card: "BT1-013", as: "rest2" },
            { card: "BT1-001", as: "sentinel" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0, autoOrderCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("command").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "orderCards"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("chaosmon").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("rest1").instanceId,
      s.inst("rest2").instanceId,
      s.inst("sentinel").instanceId,
    ]);
    expect(s.decisions.some((decision) => decision.req.kind === "chooseOption")).toBe(true);
    expect(s.decisions.some((decision) => decision.req.kind === "orderCards")).toBe(true);
  });

  it("When Moving adds an ACCEL card and returns the rest to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "mover" },
          deck: [
            { card: "BT20-039", as: "accel" },
            { card: "BT1-009", as: "rest1" },
            { card: "BT1-013", as: "rest2" },
            { card: "BT1-001", as: "sentinel" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1, autoOrderCards: true },
    );
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck[0]?.instanceId === s.inst("sentinel").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("accel").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("rest1").instanceId,
      s.inst("rest2").instanceId,
    ]);
  });

  it("grants inherited +1000 DP only while Commandramon is under a host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT25-066", dp: 5000, as: "host", under: [CARD_ID] },
          { card: CARD_ID, dp: 2000, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("standalone").currentDP).toBe(2000);
  });

  it("returns all three nonmatching reveals without adding a card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "command" }],
          deck: [
            { card: "BT25-064", as: "one" },
            { card: "BT25-062", as: "two" },
            { card: "BT25-061", as: "three" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("command").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === CARD_ID));
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === CARD_ID)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("one").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("one").instanceId,
      s.inst("two").instanceId,
      s.inst("three").instanceId,
    ]);
  });
});
