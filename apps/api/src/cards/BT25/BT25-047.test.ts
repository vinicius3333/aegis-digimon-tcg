import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_047 } from "./BT25-047.js";
import "../index.js";

describe("BT25-047 Floramon", () => {
  it("reveals three and adds Vegetation/Shaman plus TS", () => {
    const onPlay = BT25_047.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const reveal = onPlay?.actions?.[0] as { add?: unknown } | undefined;
    expect(reveal?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Vegetation", "Shaman"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      }),
    ]);
    const inherited = BT25_047.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "YourTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
    });
  });

  it("resolves both search pools through a natural On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-047", as: "floramon" }],
          deck: [
            { card: "BT1-065", as: "vegetation" },
            { card: "BT25-034", as: "ts" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("floramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("vegetation").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ts").instanceId) &&
        s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("rest").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("vegetation").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("uses the public zero-cost TS alternate evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-002", as: "egg" }],
        hand: [{ card: "BT25-047", as: "floramon" }],
        deck: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-011" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("floramon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT25-047");
    expect(s.state.memory).toBe(0);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-002"]);
  });

  it("uses the ordinary green Lv.2 evolution at its printed zero cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST23-01", as: "greenEgg" }],
        hand: [{ card: "BT25-047", as: "floramon" }],
        deck: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-011" }],
      },
    });
    await s.ready();
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenEgg").permanentId,
        instanceId: s.inst("floramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenEgg").topCard.cardId === "BT25-047");
    expect(s.state.memory).toBe(1);
    expect(s.perm("greenEgg").stack.map((card) => card.cardId)).toEqual(["ST23-01"]);
  });

  it("rejects a wrong-color non-TS Lv.2 source on the ordinary route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "redEgg" }],
        hand: [{ card: "BT25-047", as: "floramon" }],
        deck: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-011" }],
      },
    });
    await s.ready();
    s.state.memory = 1;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("redEgg").permanentId,
      instanceId: s.inst("floramon").instanceId,
    });

    expect(result).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redEgg").topCard.cardId).toBe("BT1-001");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-047");
    expect(s.state.memory).toBe(1);
  });

  it("uses the Shaman alternative without borrowing the TS pool", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT25-047", as: "floramon" }], deck: ["BT1-057", "BT1-009", "BT1-010"] } },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("floramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-057"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-057"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("uses the TS alternative without a Vegetation or Shaman card", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT25-047", as: "floramon" }], deck: ["BT25-034", "BT1-009", "BT1-010"] } },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("floramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT25-034"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-034"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("executes inherited Your Turn +1000 DP for every own Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT25-050", as: "stacked", under: ["BT25-047"] },
          { card: "BT1-009", as: "other" },
        ],
        hand: [{ card: "BT1-010", as: "newcomer" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("stacked").currentDP).toBe(s.perm("stacked").baseDP + 1000);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP + 1000);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("stacked").currentDP).toBe(s.perm("stacked").baseDP);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("newcomer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("newcomer").instanceId,
      ),
    );
    expect(s.perm("newcomer").currentDP).toBe(s.perm("newcomer").baseDP + 1000);
    expect(s.perm("stacked").currentDP).toBe(s.perm("stacked").baseDP + 1000);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP + 1000);
  });

  it("does not grant the inherited aura without a Floramon source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT25-050", as: "standalone" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("standalone").currentDP).toBe(s.perm("standalone").baseDP);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP);
  });

  it("returns all misses in order and takes one overlapping Vegetation/TS card only once", async () => {
    const misses = setupEngine({
      0: { hand: [{ card: "BT25-047", as: "floramon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await misses.ready();
    expect(misses.engine.applyIntent(0, { type: "playCard", instanceId: misses.inst("floramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        misses.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-047") &&
        misses.state.players[0]!.deck.length === 3,
    );
    expect(misses.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);

    const overlap = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-047", as: "floramon" }],
          deck: [
            { card: "BT25-050", as: "overlap" },
            { card: "BT1-009", as: "missOne" },
            { card: "BT1-010", as: "missTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await overlap.ready();
    expect(
      overlap.engine.applyIntent(0, { type: "playCard", instanceId: overlap.inst("floramon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() =>
      overlap.state.players[0]!.hand.some((card) => card.instanceId === overlap.inst("overlap").instanceId),
    );
    expect(overlap.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([overlap.inst("overlap").instanceId]);
    expect(overlap.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      overlap.inst("missOne").instanceId,
      overlap.inst("missTwo").instanceId,
    ]);
  });
});
