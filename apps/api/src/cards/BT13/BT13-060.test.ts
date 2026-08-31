import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-060.js";

describe("BT13-060 Rosemon: Burst Mode", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Rosemon"],
        cost: 0,
        isAlternate: true,
        burstDigivolve: { returnTamerNamesExact: ["Yoshino Fujieda"] },
      },
    ]);
    expect(digivolutionRequirementsFor("BT13-060")).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        }),
        expect.objectContaining({
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 },
        }),
        expect.objectContaining({
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { count: "all", filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
        }),
      ],
    });
    expect(compiled.effects[0]?.actions.some((action) => action.kind === "Unsuspend")).toBe(false);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          scaling: {
            per: 2,
            unit: "cards",
            filter: { controller: "opponent", zone: "battleArea", suspended: true, kind: ["Digimon", "Tamer"] },
          },
        },
      ],
    });
    expect(compiled.effects.some((effect) => effect.trigger === "Static")).toBe(false);
    expect(compiled.effects.some((effect) => effect.trigger === "EndOfYourTurn")).toBe(false);
  });

  it("suspends an opposing Digimon and Tamer when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-060", as: "roseBurst" }] },
      1: {
        battleArea: [
          { card: "BT13-111", as: "digimon" },
          { card: "BT13-095", as: "tamer" },
        ],
      },
    });
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("roseBurst"));
    await settle(() => s.perm("digimon").isSuspended && s.perm("tamer").isSuspended);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("Burst Digivolves from Rosemon by returning Yoshino and trashes the former top at turn end", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-057", as: "base" },
          { card: "BT13-100", as: "yoshino" },
        ],
        hand: [{ card: "BT13-060", as: "burst" }],
      },
      1: {
        battleArea: [
          { card: "BT13-111", as: "digimon" },
          { card: "BT13-095", as: "tamer" },
        ],
      },
    });
    const priorTopId = s.perm("base").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-060");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yoshino").instanceId)).toBe(true);
    expect(s.perm("base").burstDigivolvePendingTrash).toBe(true);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("digimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === priorTopId)).toBe(true);
  });

  it("requires an exact Yoshino Fujieda Tamer for Burst Digivolve", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-057", as: "base" },
          { card: "ST24-14", as: "nearName" },
        ],
        hand: [{ card: "BT13-060", as: "burst" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects Rosemon (X Antibody) as the exact Rosemon Burst Digivolve host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-054", as: "roseX" },
          { card: "BT13-100", as: "yoshino" },
        ],
        hand: [{ card: "BT13-060", as: "burst" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("roseX").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("roseX").topCard?.cardId).toBe("BT15-054");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("burst").instanceId)).toBe(true);
  });

  it("does not count a suspended opponent breeding Digimon for attack security scaling", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-060", as: "attacker" }] },
      1: { breeding: { card: "BT1-015", as: "breedingOpponent", suspended: true }, security: ["BT1-001"] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("scales attack security trash from a combined battle-area Digimon and Tamer pair", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-060", as: "attacker" }] },
      1: {
        battleArea: [
          { card: "BT1-015", as: "suspendedDigimon", suspended: true },
          { card: "BT13-100", as: "suspendedTamer", suspended: true },
        ],
        security: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
