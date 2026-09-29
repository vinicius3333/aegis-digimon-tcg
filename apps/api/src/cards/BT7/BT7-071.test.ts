import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { passesPlacementGuard } from "../../engine/effects/kernel.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import "../BT13/BT13-007.js";
import "../BT2/BT2-090.js";
import "../BT5/BT5-091.js";
import "./BT7-071.js";
import "./BT7-091.js";

describe("BT7-071 Loweemon", () => {
  it("digivolves from hand onto a purple Tamer for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-090", as: "tamer" }],
        hand: [{ card: "BT7-071", as: "loweemon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("loweemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-071" && s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-071");
  });
});

describe("BT7-071 Loweemon — KB Q&A rulings", () => {
  const purpleTamerWithoutInherited = "BT2-090";
  const koichiKimura = "BT7-091";

  const setupLoweemonOnTamer = (
    tamerCard: string,
    options: {
      tamerEnteredThisTurn?: boolean;
      extra?: SeatSpec;
      opponent?: SeatSpec;
      autoAcceptOptional?: boolean;
    } = {},
  ) => {
    const s = setupEngine(
      {
        0: {
          ...options.extra,
          battleArea: [
            { card: tamerCard, as: "tamer", enteredThisTurn: options.tamerEnteredThisTurn },
            ...(options.extra?.battleArea ?? []),
          ],
          hand: [{ card: "BT7-071", as: "loweemon" }],
          deck: options.extra?.deck ?? ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: options.opponent ?? { security: ["BT1-010"] },
      },
      { autoAcceptOptional: options.autoAcceptOptional ?? false },
    );
    s.state.memory = 3;
    return s;
  };

  const digivolveLoweemonOntoTamer = (s: ReturnType<typeof setupLoweemonOnTamer>) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("tamer").permanentId,
      instanceId: s.inst("loweemon").instanceId,
    });

  const loseBattleAgainstSuspendedGroundramon = async (s: ReturnType<typeof setupLoweemonOnTamer>) => {
    const loweemonPermanentId = s.perm("tamer").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: loweemonPermanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === loweemonPermanentId) &&
        s.state.pendingDecision === undefined,
    );
  };

  const suspendedGroundramon: SeatSpec = {
    battleArea: [{ card: "BT1-020", as: "defender", dp: 7000, suspended: true }],
    security: ["BT1-010"],
  };

  it("treats the Tamer as a digivolving Digimon for digivolve triggers and can't-digivolve effects (Q1626)", async () => {
    const locked = setupLoweemonOnTamer(purpleTamerWithoutInherited, {
      extra: { breeding: { card: "BT13-007" }, battleArea: [{ card: "BT11-075", as: "digimon" }] },
    });
    await locked.ready();
    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("digimon").permanentId,
        instanceId: locked.inst("loweemon").instanceId,
      }).ok,
    ).toBe(false);
    expect(digivolveLoweemonOntoTamer(locked).ok).toBe(false);
    await settle(() => locked.state.pendingDecision === undefined);
    expect(locked.perm("tamer").topCard?.cardId).toBe(purpleTamerWithoutInherited);
    expect(locked.state.memory).toBe(3);

    const s = setupLoweemonOnTamer(purpleTamerWithoutInherited, {
      extra: { battleArea: [{ card: "BT5-091", as: "takumi" }] },
      autoAcceptOptional: true,
    });
    expect(digivolveLoweemonOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-071" && s.state.pendingDecision === undefined);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-071");
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("performs the digivolution bonus draw when digivolving onto a Tamer (Q1627)", async () => {
    const s = setupLoweemonOnTamer(purpleTamerWithoutInherited, { extra: { deck: [{ card: "BT1-010", as: "top" }] } });
    expect(digivolveLoweemonOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.memory === 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("can't attack the turn it digivolves from a Tamer played that turn (Q1628)", async () => {
    const attackAfterDigivolving = async (tamerEnteredThisTurn: boolean) => {
      const s = setupLoweemonOnTamer(purpleTamerWithoutInherited, { tamerEnteredThisTurn });
      expect(digivolveLoweemonOntoTamer(s)).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard?.cardId === "BT7-071" && s.state.pendingDecision === undefined);
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tamer").permanentId,
        target: { kind: "player" },
      }).ok;
    };

    expect(await attackAfterDigivolving(true)).toBe(false);
    expect(await attackAfterDigivolving(false)).toBe(true);
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves (Q1629)", async () => {
    const s = setupLoweemonOnTamer(purpleTamerWithoutInherited, { opponent: suspendedGroundramon });
    const tamerInstanceId = s.perm("tamer").topCard!.instanceId;
    expect(digivolveLoweemonOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-071" && s.state.pendingDecision === undefined);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([tamerInstanceId]);

    await loseBattleAgainstSuspendedGroundramon(s);
    const trash = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trash).toContain(tamerInstanceId);
    expect(trash).toContain(s.inst("loweemon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not gain the Security effect of a Tamer in its digivolution cards (Q1630)", async () => {
    const s = setupLoweemonOnTamer(koichiKimura, { autoAcceptOptional: true });
    const koichi = s.perm("tamer").topCard!;
    const internals = internalsOf(s.engine);
    const koichiSource = internals.cardSourceOf(koichi);
    const securityEffects = Object.values(EffectTiming)
      .filter((timing): timing is EffectTiming => typeof timing === "number")
      .flatMap((timing) => effectsOf(timing, koichiSource))
      .filter(({ isSecurity }) => isSecurity);
    const koichiSecurityEffectIsActive = () =>
      securityEffects.some((effect) => passesPlacementGuard(effect, internals.buildEffectContext(koichiSource, {})));
    expect(securityEffects).not.toHaveLength(0);
    expect(koichiSecurityEffectIsActive()).toBe(true);

    expect(digivolveLoweemonOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-071" && s.state.pendingDecision === undefined);
    expect(koichiSecurityEffectIsActive()).toBe(false);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("tamer"), koichiKimura)).toBe(true);

    const loweemonPermanentId = s.perm("tamer").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: loweemonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([loweemonPermanentId]);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([koichi.instanceId]);
  });

  it("gains the Inherited effect of a Tamer in its digivolution cards (Q1631)", async () => {
    const memoryAfterDeletion = async (tamerCard: string) => {
      const s = setupLoweemonOnTamer(tamerCard, { opponent: suspendedGroundramon, autoAcceptOptional: true });
      expect(digivolveLoweemonOntoTamer(s)).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard?.cardId === "BT7-071" && s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(1);
      await loseBattleAgainstSuspendedGroundramon(s);
      return s.state.memory;
    };

    expect(await memoryAfterDeletion(koichiKimura)).toBe(2);
    expect(await memoryAfterDeletion(purpleTamerWithoutInherited)).toBe(1);
  });

  it("can't decline a declared digivolution onto a Tamer, and can't declare it without a valid base (Q4649)", async () => {
    const redTamer = "BT1-085";
    const noValidBase = setupLoweemonOnTamer(redTamer);
    expect(digivolveLoweemonOntoTamer(noValidBase).ok).toBe(false);
    await settle(() => noValidBase.state.pendingDecision === undefined);
    expect(noValidBase.perm("tamer").topCard?.cardId).toBe(redTamer);
    expect(noValidBase.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-071"]);
    expect(noValidBase.state.memory).toBe(3);

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: purpleTamerWithoutInherited, as: "tamer" }],
          hand: [{ card: "BT7-071", as: "loweemon" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    expect(digivolveLoweemonOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-071" && s.state.pendingDecision === undefined);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-071");
    expect(s.state.memory).toBe(1);
    expect(s.decisions.filter(({ seat, req }) => seat === 0 && req.kind === "optional")).toEqual([]);
  });
});
