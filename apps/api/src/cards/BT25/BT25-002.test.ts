import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-002 Wanyamon", () => {
  it("matches the catalog identity and DATA SQUAD traits", () => {
    expect(getCardDefinition("BT25-002")).toMatchObject({
      cardId: "BT25-002",
      nameEn: "Wanyamon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      forms: ["In-Training"],
      types: ["Lesser", "DATA SQUAD"],
    });
  });

  it("makes both players draw only once when its controller plays DATA SQUAD Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-021", as: "host", under: ["BT25-002"] }],
        hand: [
          { card: "BT26-094", as: "firstTamer" },
          { card: "BT26-094", as: "secondTamer" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { deck: ["BT1-003", "BT1-004"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.deck.length === 1 &&
        s.state.players[1]!.deck.length === 1 &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-001");
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-003"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-003"]);
  });

  it("does not trigger for the opponent's DATA SQUAD Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-021", as: "host", under: ["BT25-002"] }],
        deck: ["BT1-001"],
      },
      1: { hand: [{ card: "BT26-094", as: "opponentTamer" }], deck: ["BT1-003"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("reaches the inherited effect through a public Wanyamon-to-Gaomon evolution", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT25-002", as: "egg" },
        hand: [
          { card: "BT25-021", as: "gaomon" },
          { card: "BT26-094", as: "tamer" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
      1: { deck: ["BT1-004", "BT1-005"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gaomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT25-021");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("egg").inBreeding === false);
    s.state.phase = Phase.Main;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });

  it("requires both the DATA SQUAD trait and Tamer kind", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-021", as: "host", under: ["BT25-002"] }],
        hand: [
          { card: "BT26-036", as: "matchingDigimon" },
          { card: "BT1-087", as: "unrelatedTamer" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { deck: ["BT1-003", "BT1-004"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("matchingDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    // BT26-036 has its own reveal effect; the opponent's deck is the clean trigger witness.
    expect(s.state.players[1]!.deck).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unrelatedTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });
});
