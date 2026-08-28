import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-017.js";

describe("BT23-017 Betamon", () => {
  it("matches the catalog and carries every main, inherited, and evolution clause", () => {
    expect(getCardDefinition("BT23-017")).toMatchObject({
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Blue", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Amphibian", "Hudie", "CS"],
    });
    const main = compiled.effects.find((entry) => entry.trigger === "OnPlay") as any;
    expect(main.actions[0]).toMatchObject({
      kind: "Return",
      target: {
        filter: {
          zone: "trash",
          kind: ["Digimon", "Tamer", "Option"],
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
        count: 1,
      },
      to: "hand",
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      optional: true,
      abortOnDecline: true,
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        bindResultAs: "playedHudie",
        target: { filter: { kind: ["Digimon"], playCostLte: 5, nameOrTrait: [{ tokens: ["Hudie"] }] } },
      },
      { kind: "Restrict", restriction: "digivolve", duration: "permanent" },
      { kind: "DelayedDelete", timing: "endOfOpponentTurn" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays the hand-trash cost and returns exactly one non-Digi-Egg CS card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "betamon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
          trash: [
            { card: "BT23-086", as: "csTamer" },
            { card: "BT23-001", as: "csEgg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("betamon"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("csTamer").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost").instanceId, s.inst("csEgg").instanceId]),
    );
  });

  it("allows the On Play cost-and-return effect to be refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "betamon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
          trash: [{ card: "BT23-086", as: "target" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("betamon"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
  });

  it("plays a cost-5 Hudie, locks digivolution, and deletes it only at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "host", under: ["BT23-017"] }],
          hand: [
            { card: "BT23-050", as: "eligible" },
            { card: "BT23-055", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("eligible").instanceId,
    );
    expect(played).toBeDefined();
    expect(observe(s.engine).isRestricted(played!, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooExpensive").instanceId);
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === played!.permanentId)).toBe(
      true,
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === played!.permanentId)).toBe(
      false,
    );
  });

  it("digivolves for 0 from an off-color level-2 CS card and rejects a non-CS card", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-002", as: "base" }], hand: [{ card: "BT23-017", as: "betamon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("betamon").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-007", as: "base" }], hand: [{ card: "BT23-017", as: "betamon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("betamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
