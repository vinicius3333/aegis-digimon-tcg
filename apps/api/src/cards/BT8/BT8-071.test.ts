import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-071.js";
import "./BT8-010.js";
import "../BT11/BT11-086.js";
import "../BT13/BT13-007.js";
import "../EX2/EX2-007.js";
import "../EX8/EX8-074.js";
import "../ST13/ST13-16.js";

describe("BT8-071 Psychemon", () => {
  it("prevents an opponent from reducing a Digimon's play cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-071", as: "psychemon" }] },
      1: { battleArea: ["BT8-008", "BT8-034"], hand: [{ card: "BT8-010", as: "aquilamon" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("aquilamon").instanceId,
      ),
    );
    expect(s.state.memory).toBe(0);
  });

  it("also prevents its owner from reducing a play cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-071", as: "psychemon" }, "BT8-008", "BT8-034"],
        hand: [{ card: "BT8-010", as: "aquilamon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("aquilamon").instanceId,
      ),
    );

    expect(s.state.memory).toBe(0);
  });

  it("digivolves from a purple level-2 Digimon for 0 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-008", as: "base" }], hand: [{ card: "BT8-071", as: "evolving" }] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-071");

    expect(s.perm("base").topCard.cardId).toBe("BT8-071");
    expect(s.state.memory).toBe(1);
  });
});

describe("BT8-071 Psychemon — KB Q&A rulings", () => {
  async function memoryAfterAquilamonPlay(options: { player: 0 | 1; psychemonOwner?: 0 | 1 }) {
    const yellowSupport = ["BT8-008", "BT8-034"];
    const psychemon = options.psychemonOwner === undefined ? [] : ["BT8-071"];
    const s = setupEngine({
      0: {
        battleArea: [
          ...(options.psychemonOwner === 0 ? psychemon : []),
          ...(options.player === 0 ? yellowSupport : []),
        ],
        hand: options.player === 0 ? [{ card: "BT8-010", as: "aquilamon" }] : [],
      },
      1: {
        battleArea: [
          ...(options.psychemonOwner === 1 ? psychemon : []),
          ...(options.player === 1 ? yellowSupport : []),
        ],
        hand: options.player === 1 ? [{ card: "BT8-010", as: "aquilamon" }] : [],
      },
    });
    s.state.turnSeat = options.player;
    s.state.memory = 4;
    await s.ready();
    const aquilamonId = s.inst("aquilamon").instanceId;
    expect(s.engine.applyIntent(options.player, { type: "playCard", instanceId: aquilamonId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[options.player]!.battleArea.some((permanent) => permanent.topCard.instanceId === aquilamonId),
    );
    return s.state.memory;
  }

  it("stops both players from reducing play costs when the cost is paid (Q1754)", async () => {
    expect(await memoryAfterAquilamonPlay({ player: 0 })).toBe(1);
    expect(await memoryAfterAquilamonPlay({ player: 0, psychemonOwner: 0 })).toBe(0);
    expect(await memoryAfterAquilamonPlay({ player: 1, psychemonOwner: 0 })).toBe(0);
  });

  it("still lets a card be played without paying its cost (Q1755)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT8-071", "ST13-12"],
          hand: [
            { card: "ST13-16", as: "alliance" },
            { card: "ST13-04", as: "duramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const duramonId = s.inst("duramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("alliance").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === duramonId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === duramonId)).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("blocks a play cost reduction from a Digimon in the breeding area (Q1756)", async () => {
    async function memoryAfterRoyalKnightPlay(withPsychemon: boolean) {
      const s = setupEngine(
        {
          0: {
            breeding: { card: "BT13-007", as: "drasil", under: ["BT1-001", "BT1-002"] },
            hand: [{ card: "BT13-040", as: "knight" }],
          },
          1: { battleArea: withPsychemon ? ["BT8-071"] : [] },
        },
        { autoAcceptOptional: true },
      );
      s.state.memory = 10;
      await s.ready();
      const knightId = s.inst("knight").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: knightId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === knightId));
      return s.state.memory;
    }

    expect(await memoryAfterRoyalKnightPlay(false)).toBe(9);
    expect(await memoryAfterRoyalKnightPlay(true)).toBe(3);
  });

  it("allows DigiXros without its reduction and rejects a DigiXros play only the reduction could afford (Q1757)", async () => {
    function setupMervamonDigiXros(options: { memory: number; withPsychemon: boolean }) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT11-086", as: "mervamon" },
              { card: "BT10-008", as: "material" },
            ],
          },
          1: { battleArea: options.withPsychemon ? ["BT8-071"] : [] },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = options.memory;
      const playIntent = {
        type: "playCard" as const,
        instanceId: s.inst("mervamon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      };
      return { s, playIntent };
    }

    const unaffordable = setupMervamonDigiXros({ memory: 0, withPsychemon: true });
    await unaffordable.s.ready();
    expect(unaffordable.s.engine.applyIntent(0, unaffordable.playIntent)).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
    expect(unaffordable.s.state.players[0]!.hand).toHaveLength(2);
    expect(unaffordable.s.state.memory).toBe(0);

    const reducedControl = setupMervamonDigiXros({ memory: 0, withPsychemon: false });
    await reducedControl.s.ready();
    expect(reducedControl.s.engine.applyIntent(0, reducedControl.playIntent)).toEqual({ ok: true });
    await settle(() => reducedControl.s.state.players[0]!.battleArea.length === 1);
    expect(reducedControl.s.state.memory).toBe(-8);

    const fullCost = setupMervamonDigiXros({ memory: 1, withPsychemon: true });
    await fullCost.s.ready();
    expect(fullCost.s.engine.applyIntent(0, fullCost.playIntent)).toEqual({ ok: true });
    await settle(() => fullCost.s.state.players[0]!.battleArea.length === 1);
    expect(fullCost.s.perm("mervamon").stack.map((card) => card.instanceId)).toEqual([
      fullCost.s.inst("material").instanceId,
    ]);
    expect(fullCost.s.state.memory).toBe(-10);
  });

  it("stops an opponent's Mother D-Reaper from reducing a D-Reaper play cost (Q3283)", async () => {
    async function memoryAfterDReaperPlay(withPsychemon: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX2-007", as: "mother", under: ["EX2-046"] }],
            hand: [{ card: "EX2-047", as: "dReaper" }],
          },
          1: { battleArea: withPsychemon ? ["BT8-071"] : [] },
        },
        { autoAcceptOptional: true, autoOrderTriggers: true },
      );
      s.state.memory = 3;
      await s.ready();
      const dReaperId = s.inst("dReaper").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: dReaperId })).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === dReaperId),
      );
      return s.state.memory;
    }

    expect(await memoryAfterDReaperPlay(false)).toBe(1);
    expect(await memoryAfterDReaperPlay(true)).toBe(0);
  });

  it("rejects MedievalGallantmon at 0 memory because its suspend reduction is blocked (Q4442)", async () => {
    const outOfDeletionRange = 20000;
    async function setupMedievalPlay(withPsychemon: boolean) {
      const s = setupEngine(
        {
          0: { hand: [{ card: "EX8-074", as: "medieval" }] },
          1: {
            battleArea: [
              { card: withPsychemon ? "BT8-071" : "BT2-057", as: "first", dp: outOfDeletionRange },
              { card: "BT2-057", as: "second", dp: outOfDeletionRange },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;
      await s.ready();
      return s;
    }

    const blocked = await setupMedievalPlay(true);
    const blockedId = blocked.inst("medieval").instanceId;
    expect(blocked.engine.applyIntent(0, { type: "playCard", instanceId: blockedId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
    await settle();
    expect(blocked.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([blockedId]);
    expect(blocked.perm("first").isSuspended).toBe(false);
    expect(blocked.perm("second").isSuspended).toBe(false);
    expect(blocked.state.memory).toBe(0);
    expect(blocked.state.pendingDecision).toBeUndefined();

    const control = await setupMedievalPlay(false);
    const controlId = control.inst("medieval").instanceId;
    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: controlId })).toEqual({ ok: true });
    await settle(() =>
      control.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === controlId),
    );
    expect(control.perm("first").isSuspended).toBe(true);
    expect(control.perm("second").isSuspended).toBe(true);
    expect(control.state.memory).toBe(-7);
  });

  it("lets MedievalGallantmon be played at 1 memory by suspending 2 Digimon but charges the full cost of 11 (Q4443)", async () => {
    const outOfDeletionRange = 20000;
    async function playMedievalAtOneMemory(withPsychemon: boolean) {
      const s = setupEngine(
        {
          0: { hand: [{ card: "EX8-074", as: "medieval" }] },
          1: {
            battleArea: [
              { card: withPsychemon ? "BT8-071" : "BT2-057", as: "first", dp: outOfDeletionRange },
              { card: "BT2-057", as: "second", dp: outOfDeletionRange },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 1;
      await s.ready();
      const medievalId = s.inst("medieval").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: medievalId })).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === medievalId),
      );
      return s;
    }

    const withPsychemon = await playMedievalAtOneMemory(true);
    expect(withPsychemon.perm("first").isSuspended).toBe(true);
    expect(withPsychemon.perm("second").isSuspended).toBe(true);
    expect(withPsychemon.state.memory).toBe(-10);

    const control = await playMedievalAtOneMemory(false);
    expect(control.perm("first").isSuspended).toBe(true);
    expect(control.perm("second").isSuspended).toBe(true);
    expect(control.state.memory).toBe(-6);
  });
});
