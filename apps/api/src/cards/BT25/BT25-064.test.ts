import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-064.js";

const CARD_ID = "BT25-064";

describe("BT25-064 ToyAgumon", () => {
  it("alternate-digivolves from an off-color level 2 TS Digi-Egg for 0", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "tsEgg" },
        hand: [{ card: CARD_ID, as: "toy" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("toy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsEgg").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { breeding: { card: "BT1-001", as: "plainEgg" }, hand: [{ card: CARD_ID, as: "toy" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainEgg").permanentId,
        instanceId: invalid.inst("toy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("ordinary-digivolves from a legal black non-TS level 2 Digi-Egg for 0", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT11-005", as: "blackEgg" }, hand: [{ card: CARD_ID, as: "toy" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackEgg").permanentId,
        instanceId: s.inst("toy").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackEgg").topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(3);
    expect(s.perm("blackEgg").stack.map((card) => card.cardId)).toEqual(["BT11-005"]);
  });

  it("rejects ordinary evolution from a wrong-color level 2 Digi-Egg", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "redEgg" }, hand: [{ card: CARD_ID, as: "toy" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redEgg").permanentId,
        instanceId: s.inst("toy").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("redEgg").topCard?.cardId).toBe("BT1-001");
  });

  it("reveals exactly 3, mandatorily adds one Option and one distinct TS card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "toy" }],
          deck: [
            { card: "BT1-090", as: "option" },
            { card: "BT24-011", as: "ts" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("toy").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ts").instanceId),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
    const selections = s.decisions.filter((decision) => decision.req.kind === "selectCards");
    expect(selections).toHaveLength(2);
    expect(selections.every((decision) => decision.req.options?.min === 1)).toBe(true);
  });

  it("does not use one dual-matching TS Option for both add slots", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "toy" }],
          deck: [
            { card: "BT25-093", as: "overlap" },
            { card: "BT1-009", as: "plain1" },
            { card: "BT1-013", as: "plain2" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("toy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("overlap").instanceId));
    expect(s.state.players[0]!.hand.filter((card) => card.instanceId === s.inst("overlap").instanceId)).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("plain1").instanceId,
      s.inst("plain2").instanceId,
    ]);
  });

  it("returns all three cards to the deck bottom when neither reveal pool matches", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "toy" }],
        deck: [
          { card: "BT1-009", as: "miss1" },
          { card: "BT1-013", as: "miss2" },
          { card: "BT1-015", as: "miss3" },
        ],
      },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("toy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("toy").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("miss1").instanceId,
      s.inst("miss2").instanceId,
      s.inst("miss3").instanceId,
    ]);
  });

  it("grants inherited Reboot only while ToyAgumon is under a host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT25-066", as: "host", under: [CARD_ID] },
          { card: CARD_ID, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Reboot")).toBe(false);
  });

  it("uses inherited Reboot during the opponent's unsuspend phase", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-001"] },
      1: {
        deck: ["BT1-002"],
        battleArea: [
          { card: "BT25-066", as: "host", under: [CARD_ID], suspended: true },
          { card: CARD_ID, as: "standalone", suspended: true },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("standalone").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
