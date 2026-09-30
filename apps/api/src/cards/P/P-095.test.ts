import { describe, expect, it } from "vitest";
import {
  assertNoLoudGap,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
  type SeatSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-090.js";
import "./P-095.js";
import "../index.js";

describe("P-095 Pause Plug-In P", () => {
  it("requires a color source without a Tamer, but any off-color Tamer waives that requirement", async () => {
    const withoutTamer = setupEngine({
      0: { hand: [{ card: "P-095", as: "blockedOption" }] },
      1: { battleArea: [{ card: "BT1-075", dp: 12000 }] },
    });
    withoutTamer.state.memory = 10;
    await withoutTamer.ready();

    expect(
      withoutTamer.engine.applyIntent(0, {
        type: "playCard",
        instanceId: withoutTamer.inst("blockedOption").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const withTamer = setupEngine(
      {
        0: {
          battleArea: ["EX2-061"],
          hand: [{ card: "P-095", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-075", dp: 12000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    withTamer.state.memory = 10;
    await withTamer.ready();

    expect(
      withTamer.engine.applyIntent(0, {
        type: "playCard",
        instanceId: withTamer.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      withTamer.state.players[0]!.trash.some((card) => card.instanceId === withTamer.inst("option").instanceId),
    );

    expect(withTamer.state.memory).toBe(5);
    expect(withTamer.perm("target").currentDP).toBe(6000);
    assertNoLoudGap(withTamer);
  });

  it("binds both Main clauses to exactly the chosen Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-061"],
          hand: [{ card: "P-095", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-075", dp: 12000, as: "chosen" },
            { card: "BT1-075", dp: 12000, as: "other" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.at(-1)!.req;

    expect(request.sourceCardId).toBe("P-095");
    expect(request.options?.min).toBe(1);
    expect(request.options?.max).toBe(1);
    expect(request.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("chosen").permanentId, s.perm("other").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect([s.perm("chosen").currentDP, s.perm("other").currentDP]).toEqual([6000, 12000]);
    assertNoLoudGap(s);
  });

  it("keeps the chosen permanent's When Digivolving suppressed after it evolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            "EX2-061",
            { card: "BT1-009", as: "firstSuspendTarget" },
            { card: "BT1-010", as: "secondSuspendTarget" },
          ],
          hand: [{ card: "P-095", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-075", dp: 12000, as: "affectedHost" }],
          hand: [{ card: "P-090", as: "evolver" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const deckBefore = s.state.players[1]!.deck.length;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("affectedHost").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("affectedHost").topCard.instanceId === s.inst("evolver").instanceId);
    await settle(() => false, 40);

    expect(s.state.players[1]!.deck.length).toBe(deckBefore - 1);
    expect(s.perm("firstSuspendTarget").isSuspended).toBe(false);
    expect(s.perm("secondSuspendTarget").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "P-090")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("applies only the Security DP loss for the turn, then adds itself to hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "P-095", as: "securityOption" }] },
        1: {
          battleArea: [
            { card: "BT1-024", as: "attacker" },
            { card: "BT1-075", dp: 12000, as: "securityTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("securityTarget").permanentId);
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );

    expect(s.perm("securityTarget").currentDP).toBe(6000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});

describe("P-095 Pause Plug-In P — KB Q&A rulings", () => {
  async function pauseOpponentDigimon(
    opponent: SeatSpec,
    options: { pause: boolean; ownBattleArea?: (PermanentSpec | string)[] } = { pause: true },
  ): Promise<EngineSetup> {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-061", ...(options.ownBattleArea ?? [])],
          hand: [{ card: "P-095", as: "option" }],
        },
        1: opponent,
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("affected").permanentId);
    s.state.memory = 10;
    await s.ready();
    if (options.pause) {
      const optionId = s.inst("option").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
      await settle(() => false, 40);
    }
    s.state.turnSeat = 1;
    s.state.memory = 10;
    return s;
  }

  async function digivolveAffected(s: EngineSetup, evolverAlias: string): Promise<void> {
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("affected").permanentId,
        instanceId: s.inst(evolverAlias).instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("affected").topCard.instanceId === s.inst(evolverAlias).instanceId);
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => false, 40);
  }

  async function attackWithAffected(s: EngineSetup): Promise<void> {
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("affected").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  }

  const chirinmonAttacker = {
    battleArea: [{ card: "EX13-032", dp: 12000, as: "affected" }],
    security: ["BT1-009", "BT1-009", "BT1-009"],
  };

  it("stops a [When Digivolving] effect from triggering on the affected Digimon (Q5751)", async () => {
    const s = await pauseOpponentDigimon({
      battleArea: [{ card: "BT1-075", dp: 12000, as: "affected" }],
      hand: [{ card: "P-090", as: "evolver" }],
      deck: ["BT1-009", "BT1-009"],
    }, { pause: true, ownBattleArea: [{ card: "BT1-009", as: "suspendTarget" }] });

    await digivolveAffected(s, "evolver");

    expect(s.perm("suspendTarget").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "P-090")).toHaveLength(0);
  });

  it("still lets a [When Digivolving] [When Attacking] effect activate when the Digimon attacks (Q5752)", async () => {
    const s = await pauseOpponentDigimon(chirinmonAttacker, {
      pause: true,
      ownBattleArea: [{ card: "BT1-009", as: "defender", suspended: true, dp: 1000 }],
    });

    await attackWithAffected(s);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("affected").isSuspended).toBe(false);
  });

  it("does not let another effect activate the affected Digimon's [When Digivolving] effect (Q5753)", async () => {
    async function useSeikenMeppa(pause: boolean): Promise<EngineSetup> {
      const s = await pauseOpponentDigimon(
        {
          battleArea: [{ card: "BT10-112", as: "affected", suspended: true }],
          hand: [
            { card: "BT10-110", as: "meppa" },
            { card: "BT12-018", as: "knight" },
          ],
        },
        { pause },
      );
      const meppaId = s.inst("meppa").instanceId;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: meppaId })).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === meppaId));
      await settle(() => s.state.pendingDecision === undefined);
      await settle(() => false, 40);
      return s;
    }

    const control = await useSeikenMeppa(false);
    expect(control.perm("affected").stack.map(({ instanceId }) => instanceId)).toContain(
      control.inst("knight").instanceId,
    );

    const paused = await useSeikenMeppa(true);
    expect(paused.perm("affected").isSuspended).toBe(false);
    expect(paused.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(paused.inst("knight").instanceId);
    expect(paused.perm("affected").stack).toHaveLength(0);
  });

  it("does not process the 'by' cost of a blocked [When Digivolving] effect either (Q5754)", async () => {
    async function digivolveIntoChirinmon(pause: boolean): Promise<EngineSetup> {
      const s = await pauseOpponentDigimon(
        {
          battleArea: [{ card: "BT1-051", dp: 12000, as: "affected", suspended: true }],
          hand: [{ card: "EX5-031", as: "evolver" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        { pause },
      );
      await digivolveAffected(s, "evolver");
      return s;
    }

    const control = await digivolveIntoChirinmon(false);
    expect(control.state.players[1]!.security).toHaveLength(2);

    const paused = await digivolveIntoChirinmon(true);
    expect(paused.state.players[1]!.security).toHaveLength(3);
    expect(paused.perm("affected").isSuspended).toBe(true);
  });

  it("does not count the blocked digivolve timing toward [Once Per Turn], so the attack can still use it (Q5755)", async () => {
    const s = await pauseOpponentDigimon(
      {
        battleArea: [{ card: "BT1-051", dp: 12000, as: "affected" }],
        hand: [{ card: "EX13-032", as: "evolver" }],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      { pause: true, ownBattleArea: [{ card: "BT1-009", as: "defender", suspended: true, dp: 500 }] },
    );

    await digivolveAffected(s, "evolver");
    expect(s.perm("affected").currentDP).toBe(1000);
    expect(s.state.players[1]!.security).toHaveLength(3);

    await attackWithAffected(s);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("affected").isSuspended).toBe(false);
  });
});
