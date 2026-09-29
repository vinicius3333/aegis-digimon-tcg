import { digivolutionRequirementsFor, EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  settleAcrossTimers,
  type EngineSetup,
} from "../../engine/testkit/harness.js";
import { compiled } from "./BT12-065.js";
import "../AD1/AD1-023.js";
import "../BT12/BT12-066.js";
import "../BT12/BT12-094.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-088.js";

describe("BT12-065 Sephirothmon", () => {
  it("compiles the delayed forced attack as a targeted start-of-main sub-trigger", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "startOfYourMainPhase",
      on: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      duration: "untilOpponentTurnEnd",
      actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true } }],
    });
  });

  it("grants one opposing Digimon a delayed attack rather than attacking immediately", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-065", as: "sephiroth" },
            { card: "BT1-009", as: "sink", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "grantee" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sephiroth"));
    expect(s.perm("grantee").isSuspended).toBe(false);

    s.state.turnSeat = 1;
    void (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    await settle(() => s.perm("grantee").isSuspended);
    expect(s.perm("grantee").isSuspended).toBe(true);
  });

  it("digivolves for 1 from Mercurymon through the public intent", async () => {
    expect(digivolutionRequirementsFor("BT12-065")).toContainEqual({
      names: ["Mercurymon"],
      cost: 1,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-066", as: "mercury" }],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mercury").permanentId,
        instanceId: s.inst("sephiroth").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mercury").topCard.cardId === "BT12-065");
    expect(s.state.memory).toBe(0);
    expect(s.perm("mercury").stack.map(({ cardId }) => cardId)).toEqual(["BT12-066"]);
  });

  it("digivolves onto a black Tamer as a level-3 black Digimon for the printed cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-094", as: "blackTamer" }],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackTamer").permanentId,
        instanceId: s.inst("sephiroth").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackTamer").topCard.cardId === "BT12-065");
    expect(s.state.memory).toBe(0);
    expect(s.perm("blackTamer").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
  });

  it("rejects the Tamer evolution route from a non-black Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-086", as: "blueTamer" }], hand: [{ card: "BT12-065", as: "sephiroth" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: s.inst("sephiroth").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});

describe("BT12-065 Sephirothmon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

  async function digivolveOntoTamer(s: EngineSetup, tamerAlias: string): Promise<void> {
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(tamerAlias).permanentId,
        instanceId: s.inst("sephiroth").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm(tamerAlias).topCard.cardId === "BT12-065");
  }

  async function attackOversizedBlocker(s: EngineSetup, attackerAlias: string): Promise<void> {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(attackerAlias).permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
  }

  // Known engine gap (2): the baseIsTamer alternate route is not seen as a digivolving Digimon.
  it.fails("treats the Tamer as a digivolving Digimon for digivolve watchers and can't-digivolve locks (Q2190)", async () => {
    const watcherBoard = (baseCard: string) =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: baseCard, as: "base" },
              { card: "BT16-088", as: "cody" },
            ],
            hand: [{ card: "BT12-065", as: "sephiroth" }],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

    const fromDigimon = watcherBoard("BT12-066");
    fromDigimon.state.memory = 3;
    expect(
      fromDigimon.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fromDigimon.perm("base").permanentId,
        instanceId: fromDigimon.inst("sephiroth").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => fromDigimon.perm("cody").isSuspended);
    expect(fromDigimon.state.memory).toBe(3);

    const fromTamer = watcherBoard("BT12-094");
    await digivolveOntoTamer(fromTamer, "base");
    await drainMicrotasks();
    expect(fromTamer.perm("cody").isSuspended).toBe(true);
    expect(fromTamer.state.memory).toBe(1);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "kingDrasil" },
        battleArea: [
          { card: "BT12-094", as: "yuu" },
          { card: "BT12-066", as: "mercury" },
        ],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: [...FILLER],
      },
    });
    await locked.ready();
    locked.state.memory = 3;
    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("mercury").permanentId,
        instanceId: locked.inst("sephiroth").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("yuu").permanentId,
        instanceId: locked.inst("sephiroth").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(locked.perm("yuu").topCard.cardId).toBe("BT12-094");
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q2191)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-094", as: "yuu" }],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: [{ card: "BT1-010", as: "bonusCard" }],
      },
    });
    await digivolveOntoTamer(s, "yuu");
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q2192)", async () => {
    const fresh = setupEngine({
      0: {
        battleArea: [{ card: "BT12-094", as: "yuu", enteredThisTurn: true }],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: [...FILLER],
      },
      1: { security: 2, deck: [...FILLER] },
    });
    await digivolveOntoTamer(fresh, "yuu");
    expect(
      fresh.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fresh.perm("yuu").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(fresh.perm("yuu").isSuspended).toBe(false);

    const established = setupEngine({
      0: {
        battleArea: [{ card: "BT12-094", as: "yuu" }],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: [...FILLER],
      },
      1: { security: 2, deck: [...FILLER] },
    });
    await digivolveOntoTamer(established, "yuu");
    expect(
      established.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: established.perm("yuu").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon is deleted (Q2193)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-094", as: "yuu" }],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: [...FILLER],
      },
      1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 9000, suspended: true }], deck: [...FILLER] },
    });
    await digivolveOntoTamer(s, "yuu");
    expect(s.perm("yuu").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
    const seat = s.state.players[0]!;
    expect(seat.battleArea.filter(({ topCard }) => topCard.cardId === "BT12-094")).toHaveLength(0);

    await attackOversizedBlocker(s, "yuu");
    expect(seat.battleArea).toHaveLength(0);
    expect(seat.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT12-065", "BT12-094"]);
  });

  it("does not give the Digimon the Tamer source's [Security] effect (Q2194)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "yuu" }],
          hand: [{ card: "BT12-065", as: "sephiroth" }],
          deck: [...FILLER],
          security: [{ card: "BT12-094", as: "securityYuu" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await digivolveOntoTamer(s, "yuu");
    const seat = s.state.players[0]!;

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("yuu"));
    expect(s.perm("yuu").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
    expect(seat.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-065"]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityYuu"));
    await settle(() => seat.battleArea.length === 2);
    expect(seat.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(["BT12-065", "BT12-094"]);
  });

  it("gives the Digimon the Tamer source's inherited effect (Q2195)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-023", as: "tenWarriors" }],
          hand: [{ card: "BT12-065", as: "sephiroth" }],
          deck: [...FILLER],
          security: [{ card: "BT1-011", as: "topSecurity" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 9000, suspended: true }], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await digivolveOntoTamer(s, "tenWarriors");
    expect(s.perm("tenWarriors").stack.map(({ cardId }) => cardId)).toEqual(["AD1-023"]);

    await attackOversizedBlocker(s, "tenWarriors");
    const seat = s.state.players[0]!;
    expect(seat.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-065"]);
    expect(seat.security).toHaveLength(0);
    expect(seat.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("topSecurity").instanceId);
  });
  function grantBoard(options: { restrictOpponent?: "attack" | "beAffected"; extraTarget?: boolean } = {}) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-065", as: "sephiroth" },
            { card: "BT12-065", as: "secondSephiroth" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: [...FILLER],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "grantee", dp: 10_000 },
            ...(options.extraTarget === true ? [{ card: "BT1-010", as: "other", dp: 10_000 }] : []),
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("grantee").permanentId);
    if (options.restrictOpponent === "attack") {
      advance(s.engine).ledgers.continuous.addRestriction(
        s.perm("grantee").permanentId,
        "attack",
        EffectDuration.Permanent,
      );
    }
    if (options.restrictOpponent === "beAffected") {
      advance(s.engine).ledgers.continuous.addRestriction(
        s.perm("grantee").permanentId,
        "beAffected",
        EffectDuration.Permanent,
        { fromSourceKind: ["Digimon"] },
      );
    }
    return { s, preferred };
  }

  const forcedAttacksBy = (s: EngineSetup, aliases: string[]) => {
    const attackerIds = aliases.map((alias) => s.perm(alias).permanentId);
    return s.events.filter(
      (event) =>
        event.kind === "attackDeclared" &&
        "attackerPermanentId" in event &&
        attackerIds.includes(event.attackerPermanentId),
    );
  };

  async function reachOpponentMainPhaseStart(s: EngineSetup): Promise<void> {
    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    // A queued second forced attack would start only after the first one ends.
    await drainMicrotasks();
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
  }

  it("can give the forced attack to a Digimon that can't attack, but it does not attack (Q2197)", async () => {
    const { s } = grantBoard({ restrictOpponent: "attack", extraTarget: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sephiroth"));
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("grantee").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("other").permanentId)).toHaveLength(0);

    await reachOpponentMainPhaseStart(s);
    expect(forcedAttacksBy(s, ["grantee", "other"])).toHaveLength(0);
    expect(s.perm("grantee").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);

    const control = grantBoard().s;
    await control.ready();
    await advance(control.engine).fire(EffectTiming.WhenDigivolving, control.perm("sephiroth"));
    await reachOpponentMainPhaseStart(control);
    expect(forcedAttacksBy(control, ["grantee"])).toHaveLength(1);
  });

  it("declares only one attack when two granted start-of-main attacks trigger together (Q2198)", async () => {
    const { s, preferred } = grantBoard({ extraTarget: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sephiroth"));
    preferred.splice(0, preferred.length, s.perm("other").permanentId);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("secondSephiroth"));
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("grantee").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("other").permanentId)).toHaveLength(1);

    await reachOpponentMainPhaseStart(s);
    expect(forcedAttacksBy(s, ["grantee", "other"])).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect([s.perm("grantee").isSuspended, s.perm("other").isSuspended].sort()).toEqual([false, true]);
  });

  it("can give the forced attack to an unaffected Digimon, but it does not trigger while unaffected (Q2199)", async () => {
    const { s } = grantBoard({ restrictOpponent: "beAffected" });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sephiroth"));
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("grantee").permanentId)).toHaveLength(1);

    await reachOpponentMainPhaseStart(s);
    expect(forcedAttacksBy(s, ["grantee"])).toHaveLength(0);
    expect(s.perm("grantee").isSuspended).toBe(false);

    const control = grantBoard().s;
    await control.ready();
    await advance(control.engine).fire(EffectTiming.WhenDigivolving, control.perm("sephiroth"));
    await reachOpponentMainPhaseStart(control);
    expect(forcedAttacksBy(control, ["grantee"])).toHaveLength(1);
  });

  it("must complete the Tamer digivolution once declared and cannot be declared without a legal base (Q4655)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "yuu" }],
          hand: [{ card: "BT12-065", as: "sephiroth" }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true },
    );
    await digivolveOntoTamer(s, "yuu");
    expect(s.perm("yuu").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT12-065")).toBe(false);

    const noLegalBase = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "blueTamer" }],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: [...FILLER],
      },
    });
    noLegalBase.state.memory = 3;
    expect(
      noLegalBase.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: noLegalBase.perm("blueTamer").permanentId,
        instanceId: noLegalBase.inst("sephiroth").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(noLegalBase.state.memory).toBe(3);
    expect(noLegalBase.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-065"]);
  });
});
