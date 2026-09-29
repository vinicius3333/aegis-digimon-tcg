import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT12-013.js";
import "./BT12-088.js";
import "../BT13/BT13-007.js";

describe("BT12-013 BurningGreymon", () => {
  it("digivolves from Agunimon for 1 and gains 2000 DP for the turn", async () => {
    expect(digivolutionRequirementsFor("BT12-013")).toContainEqual({ names: ["Agunimon"], cost: 1, isAlternate: true });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-012", as: "aguni" }],
        hand: [{ card: "BT12-013", as: "burning" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aguni").permanentId,
        instanceId: s.inst("burning").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aguni").topCard.cardId === "BT12-013");
    expect(s.state.memory).toBe(9);
    expect(s.perm("aguni").currentDP).toBe(8000);
    expect(s.perm("aguni").stack.map(({ cardId }) => cardId)).toContain("BT12-012");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("digivolves from Takuya for 2 and preserves the Tamer as a source", async () => {
    expect(digivolutionRequirementsFor("BT12-013")).toContainEqual({
      names: ["Takuya Kanbara"],
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT12-013", as: "burning" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("burning").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT12-013");
    expect(s.state.memory).toBe(8);
    await s.engine.recomputeContinuousEffects();
    // 6000 printed + 2000 [When Digivolving] + 2000 from Takuya's inherited [Your Turn] effect.
    expect(s.perm("takuya").currentDP).toBe(10000);
    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toContain("BT12-088");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("rejects the Tamer evolution route from a non-Takuya Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-089", as: "takato" }], hand: [{ card: "BT12-013", as: "burning" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takato").permanentId,
        instanceId: s.inst("burning").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it.each([
    ["Hybrid", "BT12-012", 7000],
    ["Ten Warriors", "BT12-015", 10000],
  ])("grants the inherited 2000 DP bonus to a %s host", async (_trait, hostCard, expectedDP) => {
    const s = setupEngine({ 0: { battleArea: [{ card: hostCard, as: "host", under: ["BT12-013"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(expectedDP);
  });

  it("does not grant the inherited bonus to a plain host or during the opponent's turn", async () => {
    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT12-013"] }] } });
    await plain.engine.recomputeContinuousEffects();
    expect(plain.perm("host").currentDP).toBe(2000);

    const offTurn = setupEngine({ 0: { battleArea: [{ card: "BT12-014", as: "host", under: ["BT12-013"] }] } });
    offTurn.state.turnSeat = 1;
    await offTurn.engine.recomputeContinuousEffects();
    expect(offTurn.perm("host").currentDP).toBe(7000);
  });
});

const BURNING = "BT12-013";
const TAKUYA = "BT12-088";
const TAKATO = "BT12-089";
const KING_DRASIL = "BT13-007";

function digivolveOnto(s: EngineSetup, baseAlias: string) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(baseAlias).permanentId,
    instanceId: s.inst("burning").instanceId,
    useAlternateCost: true,
  });
}

function attackPlayer(s: EngineSetup, attackerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "player" },
  });
}

async function takuyaBoard(options: { tamer?: string; enteredThisTurn?: boolean; lockedByKingDrasil?: boolean } = {}) {
  const s = setupEngine(
    {
      0: {
        ...(options.lockedByKingDrasil ? { breeding: { card: KING_DRASIL, as: "drasil" } } : {}),
        battleArea: [{ card: options.tamer ?? TAKUYA, as: "tamer", enteredThisTurn: options.enteredThisTurn ?? false }],
        hand: [{ card: BURNING, as: "burning" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
      },
      1: { security: ["BT1-010", "BT1-010"], deck: ["BT1-010", "BT1-010"] },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();
  return s;
}

async function digivolvedFromTakuya(options: { enteredThisTurn?: boolean } = {}) {
  const s = await takuyaBoard(options);
  expect(digivolveOnto(s, "tamer")).toEqual({ ok: true });
  await settle(() => s.perm("tamer").topCard?.cardId === BURNING);
  return s;
}

describe("BT12-013 BurningGreymon — KB Q&A rulings", () => {
  it("cannot decline once digivolution onto Takuya is declared, and cannot declare it without a digivolvable card (Q4652)", async () => {
    const s = await digivolvedFromTakuya();
    expect(s.decisions).toEqual([]);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual([TAKUYA]);
    expect(s.state.memory).toBe(1);

    const noDigivolvableCard = await takuyaBoard({ tamer: TAKATO });
    expect(digivolveOnto(noDigivolvableCard, "tamer")).toMatchObject({ ok: false });
    expect(noDigivolvableCard.state.players[0]!.hand.map((card) => card.cardId)).toEqual([BURNING]);
    expect(noDigivolvableCard.perm("tamer").topCard?.cardId).toBe(TAKATO);
    expect(noDigivolvableCard.state.memory).toBe(3);
  });

  it.fails("treats Takuya as a digivolving Digimon: [When Digivolving] triggers and a can't-digivolve lock blocks it (Q6542)", async () => {
    const triggered = await digivolvedFromTakuya();
    await triggered.engine.recomputeContinuousEffects();
    // 6000 printed + 2000 [When Digivolving] + 2000 from Takuya's inherited [Your Turn] effect.
    expect(triggered.perm("tamer").currentDP).toBe(10000);

    const lockedDigimon = setupEngine({
      0: {
        breeding: { card: KING_DRASIL },
        battleArea: [{ card: "BT12-012", as: "agunimon" }],
        hand: [{ card: BURNING, as: "burning" }],
        deck: ["BT1-009"],
      },
    });
    lockedDigimon.state.memory = 3;
    await lockedDigimon.ready();
    expect(digivolveOnto(lockedDigimon, "agunimon")).toMatchObject({ ok: false });

    const locked = await takuyaBoard({ lockedByKingDrasil: true });
    expect(digivolveOnto(locked, "tamer")).toMatchObject({ ok: false });
    expect(locked.perm("tamer").topCard?.cardId).toBe(TAKUYA);
    expect(locked.state.memory).toBe(3);
  });

  it("performs the digivolution bonus draw when digivolving from Takuya (Q6543)", async () => {
    const s = await digivolvedFromTakuya();
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Takuya played that same turn (Q6544)", async () => {
    const freshTamer = await digivolvedFromTakuya({ enteredThisTurn: true });
    expect(attackPlayer(freshTamer, "tamer")).toMatchObject({ ok: false });
    expect(freshTamer.perm("tamer").isSuspended).toBe(false);
    expect(freshTamer.state.players[1]!.security).toHaveLength(2);

    const establishedTamer = await digivolvedFromTakuya({ enteredThisTurn: false });
    expect(attackPlayer(establishedTamer, "tamer")).toEqual({ ok: true });
  });

  it("keeps Takuya as a digivolution card and trashes it when BurningGreymon leaves the field (Q6545)", async () => {
    const s = await digivolvedFromTakuya();
    const takuyaCardId = s.perm("tamer").stack[0]!.instanceId;
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual([TAKUYA]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [takuyaCardId, s.inst("burning").instanceId].sort(),
    );
  });

  it("does not grant Takuya's [Security] effect to the BurningGreymon it sits under (Q6546)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAKUYA, as: "tamer" }],
          hand: [{ card: BURNING, as: "burning" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { security: [TAKUYA, "BT1-010"], deck: ["BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(digivolveOnto(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === BURNING);
    const buriedTakuyaId = s.perm("tamer").stack[0]!.instanceId;

    // Opening a [Security] window on the whole stack also collects the buried Tamer's effects,
    // so only the ruling keeps its "play this card" effect from firing.
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("tamer"));
    await drainMicrotasks();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([buriedTakuyaId]);

    expect(attackPlayer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === TAKUYA));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual([TAKUYA]);
  });

  it("grants Takuya's inherited effects to the BurningGreymon it sits under (Q6547)", async () => {
    const withoutTakuya = setupEngine({ 0: { battleArea: [{ card: BURNING, as: "burning" }] } });
    await withoutTakuya.engine.recomputeContinuousEffects();
    expect(withoutTakuya.perm("burning").currentDP).toBe(6000);

    const belowThreshold = setupEngine(
      {
        0: { battleArea: [{ card: BURNING, as: "burning", under: [TAKUYA] }], deck: ["BT1-010", "BT1-010"] },
        1: { security: ["BT1-010", "BT1-010"], deck: ["BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    belowThreshold.state.memory = 1;
    await belowThreshold.ready();
    await belowThreshold.engine.recomputeContinuousEffects();
    expect(belowThreshold.perm("burning").currentDP).toBe(8000);
    // Near-miss: below 10000 DP the granted memory effect must stay inactive.
    expect(attackPlayer(belowThreshold, "burning")).toEqual({ ok: true });
    await settle(() => belowThreshold.state.players[1]!.trash.length === 1);
    await drainMicrotasks();
    expect(belowThreshold.state.memory).toBe(1);

    const s = await digivolvedFromTakuya();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("tamer").currentDP).toBe(10000);
    expect(s.state.memory).toBe(1);
    expect(attackPlayer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 1);
    await drainMicrotasks();
    expect(s.state.memory).toBe(3);
  });
});
