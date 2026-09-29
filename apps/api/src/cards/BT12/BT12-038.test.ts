import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-038.js";
import "./BT12-083.js";
import "../BT11/BT11-088.js";
import "../BT17/BT17-087.js";
import "../EX10/EX10-056.js";
import "../EX10/EX10-059.js";

describe("BT12-038 GeoGreymon", () => {
  it("requires both Agumon in name and Dinosaur trait for its 2-cost route", () => {
    expect(digivolutionRequirementsFor("BT12-038")).toContainEqual({
      level: 3,
      names: ["Agumon"],
      traits: ["Dinosaur"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("evolves from the qualifying Agumon and may free-play Marcus when none is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-034", as: "agumon" }],
          hand: [
            { card: "BT12-038", as: "geo" },
            { card: "BT12-092", as: "marcus" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("geo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-092"));
    expect(s.state.memory).toBe(3);
    expect(s.perm("agumon").stack.map(({ cardId }) => cardId)).toContain("BT12-034");
  });

  it("does not apply the special cost to an Agumon without Dinosaur", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "agumon" }],
        hand: [{ card: "BT12-038", as: "geo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("geo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT12-038");
    expect(s.state.memory).toBe(2);
  });

  it("does not play another Marcus and its inherited Tamer watcher resolves once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-038", as: "geo", under: ["BT12-038"] },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT13-095", as: "otherMarcus" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
    await advance(s.engine).verb.unsuspend([s.perm("marcus").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("otherMarcus").instanceId);
  });
});

describe("BT12-038 GeoGreymon — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;

  function boardWithOpposingMarcus(placerSeat: SeatSpec, markerSeat: SeatSpec, preferred: string[] = []): Setup {
    return setupEngine(
      {
        0: { deck: ["BT1-009", "BT1-009", "BT1-009"], security: ["BT1-009", "BT1-009"], ...placerSeat },
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
          ...markerSeat,
          hand: [{ card: "BT17-087", as: "marcus" }, ...(markerSeat.hand ?? [])],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
  }

  async function playMarcusAsDigimon(s: Setup): Promise<void> {
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    s.state.turnSeat = 0;
  }

  async function expectInheritedWhileMarcusIsDigimon(s: Setup, geoInstanceId: string, placer: string): Promise<void> {
    const marcusId = s.perm("marcus").permanentId;
    expect(s.perm("marcus").stack[0]?.instanceId).toBe(geoInstanceId);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(true);

    s.state.turnSeat = 1;
    const dpBeforeSuspend = s.perm(placer).currentDP;
    await advance(s.engine).verb.suspend([marcusId]);
    await settle(() => s.perm(placer).currentDP === dpBeforeSuspend - 2000);
    expect(s.perm(placer).currentDP).toBe(dpBeforeSuspend - 2000);

    await advance(s.engine).verb.unsuspend([marcusId]);
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(false);
    expect(s.perm("marcus").stack[0]?.instanceId).toBe(geoInstanceId);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(false);

    const dpAfterDigimonStatusEnds = s.perm(placer).currentDP;
    await advance(s.engine).verb.suspend([marcusId]);
    await drainMicrotasks();
    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.perm(placer).currentDP).toBe(dpAfterDigimonStatusEnds);
  }

  it("a Digimon-treated Marcus Damon gains GeoGreymon's inherited effect when BT11-088 places it under Marcus, until Marcus stops being a Digimon (Q2114)", async () => {
    const preferred: string[] = [];
    const s = boardWithOpposingMarcus(
      { hand: [{ card: "BT11-088", as: "bagramon" }] },
      { battleArea: [{ card: "BT12-038", as: "geo" }] },
      preferred,
    );
    await playMarcusAsDigimon(s);
    const geoInstanceId = s.perm("geo").topCard.instanceId;
    preferred.push(geoInstanceId, s.perm("geo").permanentId);

    s.state.memory = 14;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").stack.some(({ instanceId }) => instanceId === geoInstanceId));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("marcus").permanentId,
    ]);

    await expectInheritedWhileMarcusIsDigimon(s, geoInstanceId, "bagramon");
  });

  it("a Digimon-treated Marcus Damon gains GeoGreymon's inherited effect when BT12-083 moves GeoGreymon from the battle area under Marcus, until Marcus stops being a Digimon (Q4997)", async () => {
    const preferred: string[] = [];
    const s = boardWithOpposingMarcus(
      {
        battleArea: [
          { card: "BT12-011", as: "arrester" },
          { card: "BT12-087", as: "ownTamer" },
        ],
        hand: [{ card: "BT12-083", as: "arresterCard" }],
      },
      { battleArea: [{ card: "BT12-038", as: "geo" }] },
      preferred,
    );
    await playMarcusAsDigimon(s);
    const geoInstanceId = s.perm("geo").topCard.instanceId;
    preferred.push(geoInstanceId, s.perm("geo").permanentId);

    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("arrester").permanentId,
        instanceId: s.inst("arresterCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").stack.some(({ instanceId }) => instanceId === geoInstanceId));
    expect(s.perm("arrester").topCard.cardId).toBe("BT12-083");
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("marcus").permanentId,
    ]);

    await expectInheritedWhileMarcusIsDigimon(s, geoInstanceId, "arrester");
  });

  it("a Digimon-treated Marcus Damon gains GeoGreymon's inherited effect when EX10-056 moves GeoGreymon from the battle area under Marcus, until Marcus stops being a Digimon (Q5147)", async () => {
    const preferred: string[] = [];
    const s = boardWithOpposingMarcus(
      { hand: [{ card: "EX10-056", as: "bagramon" }] },
      { battleArea: [{ card: "BT12-038", as: "geo" }] },
      preferred,
    );
    await playMarcusAsDigimon(s);
    const geoInstanceId = s.perm("geo").topCard.instanceId;
    preferred.push(geoInstanceId, s.perm("geo").permanentId);

    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").stack.some(({ instanceId }) => instanceId === geoInstanceId));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("marcus").permanentId,
    ]);

    await expectInheritedWhileMarcusIsDigimon(s, geoInstanceId, "bagramon");
  });

  it("a Digimon-treated Marcus Damon gains GeoGreymon's inherited effect when EX10-059 places GeoGreymon from the opponent's hand under Marcus, until Marcus stops being a Digimon (Q5165)", async () => {
    const s = boardWithOpposingMarcus(
      { hand: [{ card: "EX10-059", as: "darkness" }] },
      { hand: [{ card: "BT12-038", as: "geoInHand" }] },
    );
    await playMarcusAsDigimon(s);
    const geoInstanceId = s.inst("geoInHand").instanceId;
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([geoInstanceId]);

    s.state.memory = 16;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkness").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").stack.some(({ instanceId }) => instanceId === geoInstanceId));
    expect(s.state.players[1]!.hand).toHaveLength(0);

    await expectInheritedWhileMarcusIsDigimon(s, geoInstanceId, "darkness");
  });
});
