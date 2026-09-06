import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-057.js";
import "../index.js";

describe("BT26-057 Bearcatmon", () => {
  it("encodes Digimon-effect immunity, dual All Turns unsuspend triggers, TS waiver, and granted attack", () => {
    expect(digivolutionRequirementsFor("BT26-057")).toContainEqual({
      level: 4,
      traits: ["Glowing Dawn"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
          actions: [
            { kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Digimon"] },
            { kind: "ModifyDP", amount: 3000 },
          ],
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenAttackTargetSwitched" },
        { kind: "SubTrigger", event: "whenDigivolutionTrashed" },
      ],
    });
    expect(compiled.effects?.[2]?.actions).toContainEqual(expect.objectContaining({ kind: "WaiveColorRequirement" }));
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "DeDigivolve", amount: 1 },
        { kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" },
      ],
    });
  });

  it("uses the Lv.4 Glowing Dawn alternate evolution and rejects a non-trait base", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT25-035", as: "glowingDawnBase" }],
        hand: [{ card: "BT26-057", as: "bearcatmon" }],
      },
    });
    legal.state.memory = 3;
    await legal.ready();

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("glowingDawnBase").permanentId,
        instanceId: legal.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("glowingDawnBase").topCard.cardId === "BT26-057");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("glowingDawnBase").stack.map(({ cardId }) => cardId)).toEqual(["BT25-035"]);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "nonGlowingDawnBase" }],
        hand: [{ card: "BT26-057", as: "bearcatmon" }],
      },
    });
    invalid.state.memory = 3;
    await invalid.ready();

    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonGlowingDawnBase").permanentId,
        instanceId: invalid.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("publicly pays with a face-down Tamer card and gains DP plus Digimon-effect immunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-057", as: "bearcatmon" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bearcatmon"));

    expect(s.perm("bearcatmon").currentDP).toBe(11000);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).not.toContain("BT1-010");
    expect(observe(s.engine).isRestrictedByEffect(s.perm("bearcatmon"), "beAffected", "Digimon")).toBe(true);
  });

  it("grants neither protection nor DP when the exact face-down Tamer-bottom cost is unavailable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-057", as: "bearcatmon" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", faceUp: true }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bearcatmon"));

    expect(s.perm("bearcatmon").currentDP).toBe(8000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("bearcatmon"), "beAffected", "Digimon")).toBe(false);
  });

  it("ignores opposing Digimon effects but remains affected by opposing Option effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-057", as: "bearcatmon" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bearcatmon"));
    expect(s.perm("bearcatmon").currentDP).toBe(11000);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(s.perm("bearcatmon").permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("bearcatmon").currentDP).toBe(11000);

    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    await advance(s.engine).verb.modifyDP(s.perm("bearcatmon").permanentId, -1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("bearcatmon").currentDP).toBe(10000);
  });

  it("shares Once Per Turn between the target-switch and Tamer-trash unsuspend triggers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-057", as: "bearcatmon", suspended: true },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "under" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
      subjectPermanentId: s.perm("tamer").permanentId,
      byEffectSeat: 0,
    });
    expect(s.perm("bearcatmon").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("bearcatmon").permanentId]);
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("bearcatmon").permanentId,
    });
    expect(s.perm("bearcatmon").isSuspended).toBe(true);
  });

  it("Q7060/Q7062-Q7066: grants an immune Digimon the attack effect, suppresses it, then activates it after immunity", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-035", as: "glowingDawn" }],
          hand: [{ card: "BT26-057", as: "option" }],
        },
        1: {
          battleArea: [
            {
              card: "BT26-047",
              as: "immuneTarget",
              under: [{ card: "BT26-045", as: "source" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("immuneTarget").permanentId);
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("immuneTarget"));
    expect(observe(s.engine).isRestrictedByEffect(s.perm("immuneTarget"), "beAffected", "Option")).toBe(true);
    const stackBefore = s.perm("immuneTarget").stack.map(({ instanceId }) => instanceId);

    s.state.turnSeat = 0;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));
    expect(s.perm("immuneTarget").stack.map(({ instanceId }) => instanceId)).toEqual(stackBefore);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("immuneTarget").permanentId)).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("immuneTarget").permanentId]);
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("startOfYourMainPhase");
    expect(s.perm("immuneTarget").isSuspended).toBe(false);

    advance(s.engine).ledgers.continuous.sweep(s.state, "opponentTurnEnd", 0);
    await advance(s.engine).fireSubTrigger("startOfYourMainPhase");
    await settle(() => s.perm("immuneTarget").isSuspended);
    expect(s.perm("immuneTarget").isSuspended).toBe(true);
  });

  it("unsuspends from a target switch produced by a real opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-057", as: "bearcatmon", suspended: true },
            { card: "BT26-017", as: "blocker" },
          ],
        },
        1: { battleArea: [{ card: "BT26-014", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.perm("bearcatmon").isSuspended).toBe(false);
  });
});
