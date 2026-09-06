import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-058.js";
import "../index.js";

describe("BT26-058 HiAndromon", () => {
  it("encodes Reboot/Blocker, shared CS protection, and leave prevention paid by rotating its stack", () => {
    expect(digivolutionRequirementsFor("BT26-058")).toContainEqual({
      level: 5,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Reboot" }),
        expect.objectContaining({ keyword: "Blocker" }),
      ]),
    );
    expect(compiled.effects?.[1]?.sharedUseKey).toBe("bt26-058-protect-cs");
    expect(compiled.effects?.[2]?.sharedUseKey).toBe("bt26-058-protect-cs");
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          actions: [{ kind: "Prevent", cost: { kind: "placeOwnTopAtStackBottom" } }],
        },
      ],
    });
  });

  it("publicly protects a CS Digimon from opposing Digimon effects during its protection window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-058", as: "hiAndromon" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("hiAndromon"));

    expect(observe(s.engine).isRestrictedByEffect(s.perm("hiAndromon"), "beAffected", "Digimon")).toBe(true);
  });

  it("protects one chosen CS Digimon from Digimon effects but not Option effects", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-058", as: "hiAndromon" },
            { card: "BT26-054", as: "chosen" },
            { card: "BT26-054", as: "other" },
            { card: "BT1-009", as: "nonCs" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("hiAndromon"));
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chosen"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("other"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("nonCs"), "beAffected", "Digimon")).toBe(false);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(s.perm("chosen").permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("chosen").currentDP).toBe(7000);

    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    await advance(s.engine).verb.modifyDP(s.perm("chosen").permanentId, -1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("chosen").currentDP).toBe(6000);
  });

  it("shares Once Per Turn between When Digivolving and When Attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-058", as: "hiAndromon" },
            { card: "BT26-054", as: "first" },
            { card: "BT26-054", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("hiAndromon"));
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("hiAndromon"));

    expect(observe(s.engine).isRestrictedByEffect(s.perm("first"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("second"), "beAffected", "Digimon")).toBe(false);
  });

  it("prevents a CS Digimon leaving by rotating HiAndromon's top card to its stack bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-058", as: "hiAndromon", under: [{ card: "BT26-054", as: "rotation" }] },
            { card: "BT26-054", as: "protected" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const protectedId = s.perm("protected").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([protectedId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === protectedId)).toBe(true);
    expect(s.perm("hiAndromon").topCard.cardId).toBe("BT26-054");
    expect(s.perm("hiAndromon").stack[0]?.cardId).toBe("BT26-058");
  });

  it("prevents HiAndromon itself leaving by rotating to the next stacked CS card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-058", as: "hiAndromon", under: [{ card: "BT26-054", as: "next" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("hiAndromon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.map(({ permanentId: id }) => id)).toContain(permanentId);
    expect(s.perm("hiAndromon").topCard.instanceId).toBe(s.inst("next").instanceId);
    expect(s.perm("hiAndromon").stack.at(0)?.cardId).toBe("BT26-058");
  });

  it("can't prevent a CS Digimon leaving when HiAndromon has no stacked card to pay", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-058", as: "hiAndromon" },
            { card: "BT26-054", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([targetId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(targetId);
    expect(s.decisions).toHaveLength(0);
  });

  it("does not replace departure for an own non-CS Digimon or an opponent CS Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-058", as: "hiAndromon", under: [{ card: "BT26-054", as: "rotation" }] },
            { card: "BT1-009", as: "ownNonCs" },
          ],
        },
        1: { battleArea: [{ card: "BT26-054", as: "opponentCs" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ownNonCs").permanentId], "byEffect")).toBe(1);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("opponentCs").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT26-058"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("hiAndromon").stack.map(({ cardId }) => cardId)).toEqual(["BT26-054"]);
  });

  it("publishes Reboot and Blocker and uses the level 5 CS evolution route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-054", as: "base" }],
        hand: [{ card: "BT26-058", as: "hiAndromon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hiAndromon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-058");

    expect(s.perm("base").topCard.cardId).toBe("BT26-058");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
