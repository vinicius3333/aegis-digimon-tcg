import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX12-052.js";

describe("EX12-052 Diarbbitmon", () => {
  it("maps evolution, keywords, Use Req., immunity, shared OPT, direct battle, and Option Main", () => {
    expect(digivolutionRequirementsFor("EX12-052")).toEqual([
      { level: 5, texts: ["Angoramon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["NSp"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Vortex", raw: "＜Vortex＞" }] },
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            condition: {
              kind: "youHave",
              filter: {
                zone: "battleArea",
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
              },
              raw: "you have an [NSp] trait card in play",
            },
          },
        ],
      },
    ]);

    const digivolving = compiled.effects.filter((effect) => effect.trigger === "WhenDigivolving");
    expect(digivolving).toHaveLength(2);
    expect(digivolving[0]).toMatchObject({
      actions: [
        { kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Digimon"], duration: "untilOpponentTurnEnd" },
      ],
    });
    expect(digivolving[1]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", optional: true },
        {
          kind: "Battle",
          attacker: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, fromSelectionRef: "buffedDigimon" },
          defender: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
    for (const trigger of ["WhenAttacking", "Counter"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "ModifyDP" }, { kind: "Battle" }],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "Unsuspend", optional: true },
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 } },
        {
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("protects the selected Digimon from opponent Digimon effects and forces the direct battle after the buff", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-052", as: "source", dp: 12000 }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon"));

    expect(s.perm("source").currentDP).toBe(15000);
    expect(observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("shares the once-per-turn budget across When Digivolving and When Attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-052", as: "source", dp: 12000 }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.perm("source").currentDP).toBe(15000);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").currentDP).toBe(15000);
  });

  it("resolves the Option Main face independently: unsuspends, suspends two, and locks two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-050", as: "nsp" },
            { card: "BT1-009", as: "own", suspended: true },
          ],
          hand: [{ card: "EX12-052", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "oppOne" },
            { card: "BT1-010", as: "oppTwo" },
            { card: "BT1-011", as: "oppThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("oppOne").isSuspended && s.perm("oppTwo").isSuspended);
    await settle(() => false, 60);

    expect(s.perm("own").isSuspended).toBe(false);
    const locked = ["oppOne", "oppTwo", "oppThree"].filter((alias) =>
      observe(s.engine).isRestricted(s.perm(alias), "unsuspend"),
    );
    expect(locked).toHaveLength(2);
  });
});
