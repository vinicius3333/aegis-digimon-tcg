import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-086.js";
import "./BT3-087.js";
import "./BT3-092.js";

describe("BT3-092 MaloMyotismon", () => {
  it("records one memory gain per matching deletion trigger", () => {
    const compiled = runtimeCompiledCard("BT3-092");
    const allTurns = compiled?.effects.find((effect) => effect.trigger === "AllTurns");
    const watcher = allTurns?.actions.find((action) => action.kind === "SubTrigger");
    const gain = watcher?.actions?.find((action) => action.kind === "GainMemory");

    expect(gain).toEqual({
      kind: "GainMemory",
      amount: 1,
    });
    expect(watcher).toMatchObject({ sourceFilter: { excludeSelf: true, kind: ["Digimon"] }, notSimultaneous: true });
  });

  it("has Piercing and gains 1 memory for each other Digimon deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-092", as: "maloMyotismon" },
          { card: "BT1-010", as: "mine" },
        ],
      },
      1: { battleArea: [{ card: "BT1-011", as: "theirs" }] },
    });
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasPierce(s.perm("maloMyotismon"))).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("mine").permanentId, s.perm("theirs").permanentId]);

    expect(s.state.memory).toBe(2);
  });
});

describe("BT3-092 MaloMyotismon — KB Q&A rulings", () => {
  const memoryChanges = (s: ReturnType<typeof setupEngine>) =>
    s.events.flatMap((event) => (event.kind === "memoryChanged" ? [{ from: event.from, to: event.to }] : []));

  function attackFromHandWithArukenimon() {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-086", as: "arukenimon" }],
          hand: [{ card: "BT3-092", as: "maloMyotismon" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, declineDigiXros: true },
    );
    s.state.memory = 5;
    const attackerId = s.perm("arukenimon").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    return { s, attackerId };
  }

  function attackFromTrashWithMummymon() {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-087", as: "mummymon" }],
          trash: [{ card: "BT3-092", as: "maloMyotismon" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, declineDigiXros: true },
    );
    s.state.memory = 5;
    const attackerId = s.perm("mummymon").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    return { s, attackerId };
  }

  const settleAfterSelfDeletion = ({ s, attackerId }: { s: ReturnType<typeof setupEngine>; attackerId: string }) =>
    settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT3-092") &&
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId) &&
        s.state.pendingDecision === undefined,
      5000,
    );

  function battleBoard(options: { defenderDp: number; withMaloMyotismon?: boolean }) {
    const s = setupEngine({
      0: {
        battleArea: [
          ...(options.withMaloMyotismon === false ? [] : [{ card: "BT3-092", as: "maloMyotismon" }]),
          { card: "BT1-010", as: "attacker", dp: 2000 },
        ],
      },
      1: { battleArea: [{ card: "BT1-011", as: "defender", dp: options.defenderDp, suspended: true }] },
    });
    s.state.memory = 0;
    return s;
  }

  async function attackDefender(s: ReturnType<typeof setupEngine>) {
    const attackerId = s.perm("attacker").permanentId;
    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId) &&
        s.state.pendingDecision === undefined,
      5000,
    );
    await settle(() => false, 200).catch(() => undefined);
    return { attackerId, defenderId };
  }

  it("gains 1 memory when Arukenimon plays MaloMyotismon from hand and then deletes itself (Q1105)", async () => {
    const attack = attackFromHandWithArukenimon();
    await settleAfterSelfDeletion(attack);
    await settle(() => attack.s.state.memory === 3, 2000);
    await settle(() => false, 200).catch(() => undefined);

    expect(attack.s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT3-086");
    expect(attack.s.state.memory).toBe(5 - 3 + 1);
    expect(memoryChanges(attack.s)).toEqual([
      { from: 5, to: 2 },
      { from: 2, to: 3 },
    ]);
  });

  it("gains 1 memory when Mummymon plays MaloMyotismon from trash and then deletes itself (Q1109)", async () => {
    const attack = attackFromTrashWithMummymon();
    await settleAfterSelfDeletion(attack);
    await settle(() => attack.s.state.memory === 3, 2000);
    await settle(() => false, 200).catch(() => undefined);

    expect(attack.s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT3-087");
    expect(attack.s.state.memory).toBe(5 - 3 + 1);
    expect(memoryChanges(attack.s)).toEqual([
      { from: 5, to: 2 },
      { from: 2, to: 3 },
    ]);
  });

  it("gains 2 memory when another of my Digimon deletes an opposing Digimon in battle and is deleted in return (Q1118)", async () => {
    const s = battleBoard({ defenderDp: 2000 });
    const { attackerId } = await attackDefender(s);
    await settle(() => s.state.memory === 2, 2000);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-011");
    expect(s.state.memory).toBe(2);
  });

  it("gains no memory when a Security Digimon is deleted in a security battle (Q1119)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-092", as: "maloMyotismon" },
          { card: "BT1-010", as: "attacker", dp: 2000 },
        ],
      },
      1: { security: [{ card: "BT1-011", as: "securityDigimon" }] },
    });
    s.state.memory = 0;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("securityDigimon").instanceId) &&
        s.state.pendingDecision === undefined,
      5000,
    );
    await settle(() => false, 200).catch(() => undefined);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(true);
    expect(s.state.memory).toBe(0);

    const control = battleBoard({ defenderDp: 1000 });
    await attackDefender(control);
    await settle(() => control.state.memory === 1, 2000);
    expect(control.state.memory).toBe(1);
  });

  it("activates the +1 memory effect twice when both battling Digimon are deleted (Q1120)", async () => {
    const s = battleBoard({ defenderDp: 2000 });
    await attackDefender(s);
    await settle(() => s.state.memory === 2, 2000);

    expect(memoryChanges(s)).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ]);

    const onlyDefenderDeleted = battleBoard({ defenderDp: 1000 });
    await attackDefender(onlyDefenderDeleted);
    await settle(() => onlyDefenderDeleted.state.memory === 1, 2000);
    expect(memoryChanges(onlyDefenderDeleted)).toEqual([{ from: 0, to: 1 }]);

    const withoutMaloMyotismon = battleBoard({ defenderDp: 2000, withMaloMyotismon: false });
    await attackDefender(withoutMaloMyotismon);
    expect(withoutMaloMyotismon.state.memory).toBe(0);
  });

  it("turn player gains 1 memory first, then the non-turn player, returning the gauge to its start (Q1121)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-092", as: "myMaloMyotismon" },
          { card: "BT1-010", as: "victim" },
        ],
      },
      1: { battleArea: [{ card: "BT3-092", as: "theirMaloMyotismon" }] },
    });
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId]);
    await settle(() => memoryChanges(s).length === 2 && s.state.pendingDecision === undefined, 2000);
    await settle(() => false, 200).catch(() => undefined);

    expect(memoryChanges(s)).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 0 },
    ]);
    expect(s.state.memory).toBe(0);

    const onlyMine = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-092", as: "myMaloMyotismon" },
          { card: "BT1-010", as: "victim" },
        ],
      },
    });
    onlyMine.state.memory = 0;
    await advance(onlyMine.engine).verb.deletePermanent([onlyMine.perm("victim").permanentId]);
    await settle(() => false, 200).catch(() => undefined);
    expect(memoryChanges(onlyMine)).toEqual([{ from: 0, to: 1 }]);
  });

  it("gains no memory when MaloMyotismon itself attacks and both battling Digimon are deleted (Q1122)", async () => {
    function maloMyotismonAttacks(defenderDp: number) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT3-092", as: "maloMyotismon", dp: 12000 }] },
        1: { battleArea: [{ card: "BT1-011", as: "defender", dp: defenderDp, suspended: true }] },
      });
      s.state.memory = 0;
      const attackerId = s.perm("maloMyotismon").permanentId;
      const defenderId = s.perm("defender").permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attackerId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      return { s, attackerId, defenderId };
    }

    const bothDeleted = maloMyotismonAttacks(12000);
    await settle(
      () =>
        !bothDeleted.s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === bothDeleted.defenderId) &&
        bothDeleted.s.state.pendingDecision === undefined,
      5000,
    );
    await settle(() => false, 200).catch(() => undefined);

    expect(
      bothDeleted.s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === bothDeleted.attackerId),
    ).toBe(false);
    expect(bothDeleted.s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT3-092");
    expect(bothDeleted.s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-011");
    expect(memoryChanges(bothDeleted.s)).toEqual([]);
    expect(bothDeleted.s.state.memory).toBe(0);

    const maloMyotismonSurvives = maloMyotismonAttacks(1000);
    await settle(() => maloMyotismonSurvives.s.state.memory === 1, 5000);
    expect(
      maloMyotismonSurvives.s.state.players[0]!.battleArea.some(
        ({ permanentId }) => permanentId === maloMyotismonSurvives.attackerId,
      ),
    ).toBe(true);
    expect(maloMyotismonSurvives.s.state.memory).toBe(1);
  });
});
