import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-014.js";
import "../index.js";

describe("BT21-014 BurningGreymon", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("grants Piercing and +3000 DP on play or digivolution, and may evolve into a reduced-cost level 5 Hybrid", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Agunimon"], cost: 1, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
              duration: "forTheTurn",
            },
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "forTheTurn",
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            sourceFilter: { controller: "opponent" },
            fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
            actions: [
              {
                kind: "Digivolve",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                from: ["hand"],
                payCost: true,
                reduceCost: 1,
                optional: true,
                into: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  levels: [5],
                  nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
                },
              },
            ],
          },
        ],
      }),
    );
  });

  it("plays for 6 and gains observable +3000 DP and Piercing for the turn", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-014", as: "burningGreymon" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burningGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-014"));
    const permanent = s.state.players[0]!.battleArea.find((entry) => entry.topCard.cardId === "BT21-014")!;
    expect(permanent.currentDP).toBe(9000);
    expect(observe(s.engine).hasPierce(permanent)).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("digivolves from Agunimon for 1 and receives the same temporary bonuses", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-013", as: "agunimon" }],
        hand: [{ card: "BT21-014", as: "burningGreymon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agunimon").permanentId,
        instanceId: s.inst("burningGreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agunimon").topCard.cardId === "BT21-014");
    expect(s.perm("agunimon").currentDP).toBe(11000);
    expect(observe(s.engine).hasPierce(s.perm("agunimon"))).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("uses public Agunimon evolution for Piercing combat, then expires the bonuses at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-013", as: "agunimon" }],
          hand: [{ card: "BT21-014", as: "burningGreymon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agunimon").permanentId,
        instanceId: s.inst("burningGreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agunimon").topCard.instanceId === s.inst("burningGreymon").instanceId);
    expect(s.perm("agunimon").currentDP).toBe(11000);
    expect(observe(s.engine).hasPierce(s.perm("agunimon"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("agunimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.security.length === 1 &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);

    await advance(s.engine).runTurn(0);
    expect(s.perm("agunimon").currentDP).toBe(8000);
    expect(observe(s.engine).hasPierce(s.perm("agunimon"))).toBe(false);
  });

  it("pays 3 to evolve into a level-5 Hybrid only after opponent security removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-014", as: "burningGreymon" }],
          hand: [{ card: "BT21-020", as: "aldamon" }],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burningGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burningGreymon").topCard.cardId === "BT21-020");
    expect(s.state.memory).toBe(2);
  });

  it("may decline the security-removal evolution without paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-014", as: "burningGreymon" }],
          hand: [{ card: "BT21-020", as: "aldamon" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burningGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.perm("burningGreymon").topCard.cardId).toBe("BT21-014");
    expect(s.state.memory).toBe(5);
  });

  it("does not evolve after public security removal when the hand destination is not a Hybrid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-014", as: "burningGreymon" }],
          hand: [{ card: "BT21-022", as: "invalid" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burningGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("burningGreymon").topCard.cardId).toBe("BT21-014");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("invalid").instanceId]);
    expect(s.state.memory).toBe(5);
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-020", as: "host", dp: 8000, under: ["BT21-014"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});

const TAKUYA = "BT21-082";
const AGUNIMON = "BT21-013";
const ALDAMON = "BT21-020";
const TAI_KAMIYA = "BT1-085";
const CALUMON = "EX2-045";
const KING_DRASIL = "BT13-007";
const FILLER = ["BT1-010", "BT1-010", "BT1-010"];

function digivolveBurningGreymonOnto(s: EngineSetup, baseAlias: string, burningGreymonAlias = "burningGreymon") {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(baseAlias).permanentId,
    instanceId: s.inst(burningGreymonAlias).instanceId,
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

async function digivolvedFromTakuya(options: { enteredThisTurn?: boolean } = {}) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: TAKUYA, as: "tamer", enteredThisTurn: options.enteredThisTurn ?? false }],
        hand: [{ card: "BT21-014", as: "burningGreymon" }],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-010"],
      },
      1: { security: ["BT1-010", "BT1-010"], deck: [...FILLER] },
    },
    { autoSelectCards: true, autoDeclineOptional: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(digivolveBurningGreymonOnto(s, "tamer")).toEqual({ ok: true });
  await settle(() => s.perm("tamer").topCard.cardId === "BT21-014");
  expect(s.perm("tamer").topCard.cardId).toBe("BT21-014");
  expect(s.state.memory).toBe(2);
  return s;
}

async function attackAndDigivolveIntoAldamon(options: { agunimonUnder: boolean }) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT21-014", as: "burningGreymon", under: options.agunimonUnder ? [AGUNIMON] : [] }],
        hand: [{ card: ALDAMON, as: "aldamon" }],
        deck: [...FILLER],
      },
      1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: [...FILLER] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(attackPlayer(s, "burningGreymon")).toEqual({ ok: true });
  await settle(() => s.perm("burningGreymon").topCard.cardId === ALDAMON && !observe(s.engine).isAttacking());
  return s;
}

describe("BT21-014 BurningGreymon — KB Q&A rulings", () => {
  it("resolves the checked card's [Security] effect before its 'security stack is removed from' digivolution (Q4523)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-014", as: "burningGreymon" }],
          hand: [{ card: ALDAMON, as: "aldamon" }],
          deck: [...FILLER],
        },
        1: { security: [{ card: TAI_KAMIYA, as: "securityTai" }, "BT1-010"], deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(attackPlayer(s, "burningGreymon")).toEqual({ ok: true });
    const isDigivolveOffer = ({ seat, req }: EngineSetup["decisions"][number]) =>
      seat === 0 && req.kind === "optional" && req.sourceCardId === "BT21-014";
    await settle(() => s.decisions.some(isDigivolveOffer));
    const offer = s.decisions.find(isDigivolveOffer)!.req;

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("securityTai").instanceId,
    ]);
    expect(s.perm("burningGreymon").topCard.cardId).toBe("BT21-014");

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: offer.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burningGreymon").topCard.cardId === ALDAMON);
    expect(s.perm("burningGreymon").topCard.cardId).toBe(ALDAMON);
  });

  it("reduces the Aldamon digivolution cost by 2 in total when Agunimon is in its digivolution cards (Q4524)", async () => {
    const withAgunimon = await attackAndDigivolveIntoAldamon({ agunimonUnder: true });
    expect(withAgunimon.perm("burningGreymon").topCard.cardId).toBe(ALDAMON);
    expect(withAgunimon.state.memory).toBe(3);

    const withoutAgunimon = await attackAndDigivolveIntoAldamon({ agunimonUnder: false });
    expect(withoutAgunimon.perm("burningGreymon").topCard.cardId).toBe(ALDAMON);
    expect(withoutAgunimon.state.memory).toBe(2);
  });

  it("performs another security check after digivolving mid-attack into a <Security A. +1> Digimon (Q4525)", async () => {
    const digivolved = await attackAndDigivolveIntoAldamon({ agunimonUnder: false });
    expect(digivolved.state.players[1]!.security).toHaveLength(1);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-014", as: "burningGreymon" }],
          hand: [{ card: ALDAMON, as: "aldamon" }],
          deck: [...FILLER],
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.memory = 5;
    await declined.ready();
    expect(attackPlayer(declined, "burningGreymon")).toEqual({ ok: true });
    await settle(() => declined.state.players[1]!.security.length === 2 && !observe(declined.engine).isAttacking());
    expect(declined.perm("burningGreymon").topCard.cardId).toBe("BT21-014");
    expect(declined.state.players[1]!.security).toHaveLength(2);
  });

  it("digivolves from a Tamer as-is: no 'when a Digimon digivolves' trigger and a can't-digivolve lock does not stop it (Q6677)", async () => {
    const watcherBoard = async (base: typeof TAKUYA | typeof AGUNIMON) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: base, as: "base" },
              { card: CALUMON, as: "calumon" },
            ],
            hand: [{ card: "BT21-014", as: "burningGreymon" }],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(digivolveBurningGreymonOnto(s, "base")).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT21-014");
      await drainMicrotasks();
      return s;
    };

    const fromTamer = await watcherBoard(TAKUYA);
    expect(fromTamer.perm("calumon").isSuspended).toBe(false);
    const fromDigimon = await watcherBoard(AGUNIMON);
    expect(fromDigimon.perm("calumon").isSuspended).toBe(true);

    const locked = setupEngine(
      {
        0: {
          breeding: { card: KING_DRASIL, as: "drasil" },
          battleArea: [
            { card: TAKUYA, as: "tamer" },
            { card: AGUNIMON, as: "agunimon" },
          ],
          hand: [
            { card: "BT21-014", as: "burningGreymon" },
            { card: "BT21-014", as: "secondBurningGreymon" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    locked.state.memory = 5;
    await locked.ready();

    expect(digivolveBurningGreymonOnto(locked, "agunimon", "secondBurningGreymon")).toMatchObject({ ok: false });
    expect(locked.perm("agunimon").topCard.cardId).toBe(AGUNIMON);
    expect(digivolveBurningGreymonOnto(locked, "tamer")).toEqual({ ok: true });
    await settle(() => locked.perm("tamer").topCard.cardId === "BT21-014");
    expect(locked.perm("tamer").topCard.cardId).toBe("BT21-014");
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q6678)", async () => {
    const s = await digivolvedFromTakuya();
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q6679)", async () => {
    const freshTamer = await digivolvedFromTakuya({ enteredThisTurn: true });
    expect(attackPlayer(freshTamer, "tamer")).toMatchObject({ ok: false });
    expect(freshTamer.perm("tamer").isSuspended).toBe(false);
    expect(freshTamer.state.players[1]!.security).toHaveLength(2);

    const establishedTamer = await digivolvedFromTakuya({ enteredThisTurn: false });
    expect(attackPlayer(establishedTamer, "tamer")).toEqual({ ok: true });
  });

  it("keeps a Tamer it digivolved from as a digivolution card and trashes it when the Digimon leaves the field (Q6680)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAKUYA, as: "tamer" }],
          hand: [{ card: "BT21-014", as: "burningGreymon" }],
          deck: [...FILLER],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "wall", dp: 13000, suspended: true }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const takuyaInstanceId = s.perm("tamer").topCard.instanceId;

    expect(digivolveBurningGreymonOnto(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard.cardId === "BT21-014");
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([takuyaInstanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tamer").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [takuyaInstanceId, s.inst("burningGreymon").instanceId].sort(),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6681)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-014", as: "burningGreymon", under: [{ card: TAKUYA, as: "sourceTakuya" }] }],
          security: [{ card: TAKUYA, as: "securityTakuya" }],
          deck: [...FILLER],
        },
        1: { deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const battleAreaTopCards = () => s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("burningGreymon"));
    await drainMicrotasks();
    expect(battleAreaTopCards()).toEqual([s.inst("burningGreymon").instanceId]);
    expect(s.perm("burningGreymon").stack.map((card) => card.instanceId)).toEqual([s.inst("sourceTakuya").instanceId]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTakuya"));
    await settle(() => battleAreaTopCards().includes(s.inst("securityTakuya").instanceId));
    expect(battleAreaTopCards()).toContain(s.inst("securityTakuya").instanceId);
    expect(s.perm("burningGreymon").stack.map((card) => card.instanceId)).toEqual([s.inst("sourceTakuya").instanceId]);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6682)", async () => {
    const attackWithTakuyaUnder = async (takuyaUnder: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-014", as: "burningGreymon", under: takuyaUnder ? [TAKUYA] : [] }],
            hand: [{ card: TAI_KAMIYA, as: "tai" }],
            deck: [...FILLER],
          },
          1: { security: ["BT1-010", "BT1-010"], deck: [...FILLER] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(attackPlayer(s, "burningGreymon")).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
      await drainMicrotasks();
      return s;
    };

    const withTakuya = await attackWithTakuyaUnder(true);
    expect(withTakuya.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      withTakuya.inst("tai").instanceId,
    );
    expect(withTakuya.state.players[0]!.hand).toHaveLength(0);
    expect(withTakuya.state.memory).toBe(5);

    const withoutTakuya = await attackWithTakuyaUnder(false);
    expect(withoutTakuya.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      withoutTakuya.inst("tai").instanceId,
    ]);
    expect(withoutTakuya.state.memory).toBe(5);
  });
});
