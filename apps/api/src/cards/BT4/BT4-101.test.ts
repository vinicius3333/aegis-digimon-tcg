import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-022.js";
import "../BT1/BT1-072.js";
import "../BT1/BT1-112.js";
import "../BT2/BT2-025.js";
import "../BT2/BT2-074.js";
import "./BT4-101.js";

describe("BT4-101 Final Aqua Blaster", () => {
  it("makes own Digimon delete a sourceless Digimon when attacking it", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-023", as: "attacker", dp: 1000 }], hand: [{ card: "BT4-101", as: "option" }] },
      1: { battleArea: [{ card: "BT4-045", as: "target", suspended: true, dp: 20_000 }] },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-101"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-101", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });

  it("does not delete an attack target that has a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-023", as: "attacker", dp: 25_000 }], hand: [{ card: "BT4-101", as: "option" }] },
      1: { battleArea: [{ card: "BT4-045", as: "target", suspended: true, dp: 30_000, under: ["BT4-043"] }] },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-101"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard?.cardId === "BT4-023");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});

describe("BT4-101 I'll Drag You In to the Depths! — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;

  async function useDragIntoDepths(s: Setup) {
    const option = s.inst("option");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === option.instanceId));
  }

  function attackPermanent(s: Setup, attackerAlias: string, targetAlias: string) {
    return s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "permanent", permanentId: s.perm(targetAlias).permanentId },
    });
  }

  const isInBattleArea = (s: Setup, seat: 0 | 1, permanentId: string) =>
    s.state.players[seat]!.battleArea.some((permanent) => permanent.permanentId === permanentId);

  const isInTrash = (s: Setup, seat: 0 | 1, instanceId: string) =>
    s.state.players[seat]!.trash.some((card) => card.instanceId === instanceId);

  it("deletes the attacked Digimon by effect, not in battle, so <Retaliation> does not activate (Q1257)", async () => {
    const setup = () =>
      setupEngine({
        0: {
          battleArea: [{ card: "BT4-023", as: "attacker", dp: 5000 }],
          hand: [{ card: "BT4-101", as: "option" }],
        },
        1: { battleArea: [{ card: "BT2-074", as: "devimon", suspended: true }] },
      });
    const s = setup();
    s.state.memory = 3;
    const attackerId = s.perm("attacker").permanentId;
    const devimonInstanceId = s.perm("devimon").topCard!.instanceId;
    await useDragIntoDepths(s);

    expect(attackPermanent(s, "attacker", "devimon")).toEqual({ ok: true });
    await settle(() => isInTrash(s, 1, devimonInstanceId));
    await drainMicrotasks();

    expect(isInTrash(s, 1, devimonInstanceId)).toBe(true);
    expect(isInBattleArea(s, 0, attackerId)).toBe(true);
    const devimonDeletion = s.events.find(
      (event) =>
        event.kind === "cardsMoved" &&
        event.deletedPermanents?.some((deleted) => deleted.instanceId === devimonInstanceId),
    );
    expect(devimonDeletion).toBeDefined();
    expect(devimonDeletion).not.toHaveProperty("battleDeletion", true);

    const control = setup();
    const controlAttackerId = control.perm("attacker").permanentId;
    expect(attackPermanent(control, "attacker", "devimon")).toEqual({ ok: true });
    await settle(() => !isInBattleArea(control, 0, controlAttackerId));
    expect(control.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes the attacked Digimon before blocker timing, so blocking cannot save it (Q1258)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-023", as: "attacker", dp: 1000 }],
        hand: [{ card: "BT4-101", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT4-045", as: "target", suspended: true },
          { card: "BT1-072", as: "blocker" },
        ],
      },
    });
    s.state.memory = 3;
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    await useDragIntoDepths(s);

    expect(attackPermanent(s, "attacker", "target")).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(isInTrash(s, 1, targetInstanceId)).toBe(true);

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(isInTrash(s, 1, targetInstanceId)).toBe(true);
  });

  it("does not delete a Digimon that blocks, and the battle with the blocker occurs normally (Q1260)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-023", as: "attacker", dp: 1000 }],
        hand: [{ card: "BT4-101", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT4-045", as: "target", suspended: true },
          { card: "BT1-072", as: "blocker", dp: 6000 },
        ],
      },
    });
    s.state.memory = 3;
    const attackerId = s.perm("attacker").permanentId;
    const blockerId = s.perm("blocker").permanentId;
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    await useDragIntoDepths(s);

    expect(attackPermanent(s, "attacker", "target")).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(isInTrash(s, 1, targetInstanceId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(isInBattleArea(s, 1, blockerId)).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(isInBattleArea(s, 0, attackerId)).toBe(false);
  });

  it("deletes a higher-DP attack target before battle, so the attacker is not deleted (Q1261)", async () => {
    const setup = () =>
      setupEngine({
        0: {
          battleArea: [{ card: "BT4-023", as: "attacker", dp: 2000 }],
          hand: [{ card: "BT4-101", as: "option" }],
        },
        1: { battleArea: [{ card: "BT4-045", as: "target", suspended: true, dp: 12_000 }] },
      });

    const s = setup();
    s.state.memory = 3;
    const attackerId = s.perm("attacker").permanentId;
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    await useDragIntoDepths(s);
    expect(attackPermanent(s, "attacker", "target")).toEqual({ ok: true });
    await settle(() => isInTrash(s, 1, targetInstanceId));
    await drainMicrotasks();
    expect(isInBattleArea(s, 0, attackerId)).toBe(true);

    const control = setup();
    const controlAttackerId = control.perm("attacker").permanentId;
    expect(attackPermanent(control, "attacker", "target")).toEqual({ ok: true });
    await settle(() => control.events.some((event) => event.kind === "combatResolved"));
    expect(isInBattleArea(control, 0, controlAttackerId)).toBe(false);
  });

  it("does not let <Piercing> check security after this effect deletes the attack target (Q1262)", async () => {
    const setup = () =>
      setupEngine({
        0: {
          battleArea: [{ card: "BT1-022", as: "garudamon" }, "BT4-023"],
          hand: [{ card: "BT4-101", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT4-045", as: "target", suspended: true, dp: 3000 }],
          security: ["BT4-023", "BT4-023"],
        },
      });

    const s = setup();
    s.state.memory = 3;
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    await useDragIntoDepths(s);
    expect(attackPermanent(s, "garudamon", "target")).toEqual({ ok: true });
    await settle(() => isInTrash(s, 1, targetInstanceId));
    await drainMicrotasks();
    expect(s.state.players[1]!.security).toHaveLength(2);

    const control = setup();
    expect(attackPermanent(control, "garudamon", "target")).toEqual({ ok: true });
    await settle(() => control.state.players[1]!.security.length === 1);
    expect(control.state.players[1]!.security).toHaveLength(1);
  });

  it("does not unsuspend a Dimension Scissor Digimon after this effect deletes the attack target (Q1263)", async () => {
    const setup = () => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT4-023", as: "attacker", dp: 5000 },
              { card: "BT1-064", suspended: true },
            ],
            hand: [
              { card: "BT1-112", as: "scissor" },
              { card: "BT4-101", as: "option" },
            ],
          },
          1: { battleArea: [{ card: "BT4-045", as: "target", suspended: true, dp: 3000 }] },
        },
        { autoSelectCards: true, preferInstanceIds },
      );
      preferInstanceIds.push(s.perm("attacker").topCard!.instanceId);
      return s;
    };
    const useDimensionScissor = async (s: Setup) => {
      const scissor = s.inst("scissor");
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: scissor.instanceId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === scissor.instanceId));
    };

    const s = setup();
    s.state.memory = 10;
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    await useDimensionScissor(s);
    await useDragIntoDepths(s);
    expect(attackPermanent(s, "attacker", "target")).toEqual({ ok: true });
    await settle(() => isInTrash(s, 1, targetInstanceId));
    await drainMicrotasks();
    expect(s.perm("attacker").isSuspended).toBe(true);

    const control = setup();
    control.state.memory = 10;
    await useDimensionScissor(control);
    expect(attackPermanent(control, "attacker", "target")).toEqual({ ok: true });
    await settle(() => control.events.some((event) => event.kind === "combatResolved"));
    expect(control.perm("attacker").isSuspended).toBe(false);
  });

  it("does not delete a Digimon that had a digivolution card at attack declaration, even if a [When Attacking] effect trashes it (Q1264)", async () => {
    const setup = (targetSources: string[]) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT4-023", as: "attacker", dp: 5000, under: ["BT2-025"] }],
            hand: [{ card: "BT4-101", as: "option" }],
          },
          1: { battleArea: [{ card: "BT4-045", as: "target", suspended: true, dp: 20_000, under: targetSources }] },
        },
        { autoSelectCards: true, preferTriggerKeys: ["BT2-025"] },
      );
      s.state.memory = 3;
      return s;
    };

    const s = setup(["BT4-043"]);
    const targetId = s.perm("target").permanentId;
    await useDragIntoDepths(s);
    expect(attackPermanent(s, "attacker", "target")).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    await drainMicrotasks();
    expect(isInBattleArea(s, 1, targetId)).toBe(true);
    expect(s.perm("target").stack).toHaveLength(0);

    const control = setup([]);
    const controlTargetInstanceId = control.perm("target").topCard!.instanceId;
    await useDragIntoDepths(control);
    expect(attackPermanent(control, "attacker", "target")).toEqual({ ok: true });
    await settle(() => isInTrash(control, 1, controlTargetInstanceId));
    expect(isInTrash(control, 1, controlTargetInstanceId)).toBe(true);
  });
});
