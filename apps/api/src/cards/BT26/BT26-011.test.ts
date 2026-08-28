import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-011.js";
import "../index.js";

const CARD_ID = "BT26-011";

describe("BT26-011 Buraimon", () => {
  it("compiles both Raid keywords and the two draw-two triggers", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => [effect.trigger, effect.isInherited])).toEqual([
      ["Static", undefined],
      ["OnPlay", undefined],
      ["WhenDigivolving", undefined],
      ["Static", true],
    ]);
  });
  it("evolves from an off-color Lv.3 TS Digimon for 2 and rejects a non-TS peer", async () => {
    const positive = setupEngine({
      0: {
        battleArea: [{ card: "BT25-078", as: "base" }],
        hand: [{ card: CARD_ID, as: "buraimon" }],
        deck: ["BT1-009"],
      },
    });
    positive.state.memory = 2;
    expect(
      positive.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: positive.perm("base").permanentId,
        instanceId: positive.inst("buraimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => positive.perm("base").topCard.cardId === CARD_ID);
    expect(positive.state.memory).toBe(0);
    expect(positive.perm("base").stack.at(-1)?.cardId).toBe("BT25-078");

    const negative = setupEngine({
      0: { battleArea: [{ card: "EX8-056", as: "base" }], hand: [{ card: CARD_ID, as: "buraimon" }] },
    });
    negative.state.memory = 2;
    expect(
      negative.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: negative.perm("base").permanentId,
        instanceId: negative.inst("buraimon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(negative.state.memory).toBe(2);
  });

  it("plays for 5, pays exactly one matching card, then draws 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "buraimon" },
            { card: "BT26-016", as: "cost" },
          ],
          deck: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-010", as: "two" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("buraimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(new Set(s.state.players[0]!.hand.map((card) => card.cardId))).toEqual(new Set(["BT1-009", "BT1-010"]));
  });

  it("when digivolving may pay with a Shaman card and draws 2 after the evolution draw", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-078", as: "base" }],
          hand: [
            { card: CARD_ID, as: "buraimon" },
            { card: "BT26-032", as: "shamanCost" },
            { card: "BT1-009", as: "unrelated" },
          ],
          deck: [
            { card: "BT1-010", as: "evolutionDraw" },
            { card: "BT1-011", as: "effectDrawOne" },
            { card: "BT1-012", as: "effectDrawTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("shamanCost").instanceId);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("buraimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("shamanCost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("unrelated").instanceId,
        s.inst("evolutionDraw").instanceId,
        s.inst("effectDrawOne").instanceId,
        s.inst("effectDrawTwo").instanceId,
      ]),
    );
  });

  it("publishes Raid both as the top card and inherited from a real stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "top" },
          { card: "ST8-07", as: "host", under: [{ card: CARD_ID, as: "source" }] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
  });

  it("accepts a card that mentions Chronomon only in inherited text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "buraimon" },
            { card: "BT26-001", as: "textCost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("buraimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("textCost").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("may decline the optional payment without trashing or drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "buraimon" },
            { card: "BT26-016", as: "eligibleCost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("buraimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligibleCost").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("does nothing after accepting when no hand card matches the payment filter", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "buraimon" },
            { card: "BT1-009", as: "unrelated" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("buraimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("unrelated").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("uses printed Raid to redirect a player attack to the highest-DP unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 7000 },
          ],
          security: 1,
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("high").permanentId),
    ).toBe(true);
  });
});
