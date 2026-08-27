import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled as BT25_042 } from "./BT25-042.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-042 ClavisAngemon", () => {
  it("uses the top-or-bottom security cost for each shared Once Per Turn immunity trigger", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_042.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.frequency).toBe("OncePerTurn");
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "GrantStatic",
        grant: "immuneToOpponentDigimonEffects",
        duration: "untilOpponentTurnEnd",
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine", zone: "security" }, count: 1 },
          raw: "By trashing your top or bottom security card",
        },
      });
    }
  });

  it("reacts only to removal from its own security stack before granting the follow-up keywords", () => {
    const effect = BT25_042.effects?.find((entry) => entry.trigger === "AllTurns");
    const watcher = effect?.actions?.[0] as { event?: string; sourceFilter?: unknown; actions?: unknown[] };
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(watcher.event).toBe("whenSecurityRemoved");
    expect(watcher.sourceFilter).toEqual({ controller: "mine" });
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Angel", "Iliad"], match: "trait" }],
        },
      },
    });
    expect(watcher.actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Reboot", raw: "＜Reboot＞" },
      target: { count: 2 },
      duration: "untilOpponentTurnEnd",
    });
    expect(watcher.actions?.[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
      target: { count: 2, sameTarget: true },
      duration: "untilOpponentTurnEnd",
    });
  });

  it.each([
    ["OnPlay", EffectTiming.OnPlay],
    ["WhenDigivolving", EffectTiming.WhenDigivolving],
    ["WhenAttacking", EffectTiming.OnUseAttack],
  ] as const)("pays the top-or-bottom security cost and grants immunity on %s", async (label, timing) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-042", as: "clavis" }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const trigger = timing === EffectTiming.OnUseAttack ? { attackerPermanentId: s.perm("clavis").permanentId } : {};
    await advance(s.engine).fireForPermanent(timing, s.perm("clavis"), trigger);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("clavis"), "beAffected", "Digimon")).toBe(true);
    expect(label).toBeDefined();
  });

  it("may decline the security cost without gaining immunity", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-042", as: "clavis" }], security: ["BT1-001"] } },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("clavis"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("clavis"), "beAffected", "Digimon")).toBe(false);
  });

  it("plays a qualifying Angel/Iliad card and grants both keywords to the same two Digimon only after own security removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-042", as: "clavis" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-013", as: "third" },
          ],
          hand: [{ card: "BT25-034", as: "angel" }],
          security: ["BT1-001"],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    for (const alias of ["clavis", "first", "second", "third"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Reboot")).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(false);
    }

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-034");
    expect(observe(s.engine).hasKeyword(s.perm("clavis"), "Reboot")).toBe(false);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.cardId === "BT25-034"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-034")).toBe(true);
    for (const alias of ["clavis", "first"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Reboot")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(true);
    }
    for (const alias of ["second", "third"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Reboot")).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(false);
    }

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "BT25-034")).toHaveLength(1);
  });

  it("digivolves from a level-5 Angel/Archangel/TS Digimon through the alternate cost-3 route", async () => {
    expect(BT25_042.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Angel", "Archangel", "TS"], cost: 3, isAlternate: true },
    ]);
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-040", as: "base" }],
          hand: [{ card: "BT25-042", as: "clavis" }],
          security: ["BT1-001"],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("clavis").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT25-042");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT25-040"]);
  });
});
