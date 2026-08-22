import { assemblyRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-017.js";
import "../index.js";

describe("BT26-017 Zanbamon", () => {
  it("compiles Blocker/Retaliation and both trigger paths", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["Static", "OnPlay", "WhenDigivolving", "OnDeletion"]);
    for (const effect of compiled.effects.slice(1, 3)) {
      expect(effect.actions).toMatchObject([
        { kind: "SelectBind", target: { bindAs: "zanbamonGrantTarget" } },
        { kind: "GainKeyword", target: { fromSelectionRef: "zanbamonGrantTarget" }, duration: "forTheTurn" },
        { kind: "GainKeyword", target: { fromSelectionRef: "zanbamonGrantTarget" }, duration: "forTheTurn" },
      ]);
    }
  });
  it("exposes its Shambala evolution and Assembly requirements", () => {
    expect(digivolutionRequirementsFor("BT26-017")).toContainEqual({ level: 5, traits: ["Shambala", "TS"], cost: 3, isAlternate: true });
    expect(assemblyRequirementFor("BT26-017")).toEqual([{ reduceCost: 4, materials: [{ traits: ["Shambala"], levelMax: 5, count: 2, differentLevels: true }] }]);
  });
  it("grants Security Attack and Progress to a Shambala ally on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-012", as: "ally" }], hand: [{ card: "BT26-017", as: "self" }] } }, { autoSelectCards: true });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Progress"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Progress")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "SecurityAttack")).toBe(true);
  });

  it("grants both temporary keywords when digivolving through a legal Shambala stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-014", as: "base" }],
        hand: [{ card: "BT26-017", as: "self" }],
        deck: ["BT1-009"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("self").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Progress"));

    expect(s.perm("base").topCard.cardId).toBe("BT26-017");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Progress")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack")).toBe(true);
  });

  it("publishes Blocker and Retaliation while Zanbamon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-017", as: "self" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Retaliation")).toBe(true);
  });

  it("on deletion may play exactly one play-cost-5-or-less Shambala or TS card from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-017", as: "self" }],
        trash: [
          { card: "BT26-012", as: "eligible" },
          { card: "BT26-014", as: "tooExpensive" },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.inst("eligible").instanceId);
    const selfId = s.perm("self").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      selfId,
      s.inst("tooExpensive").instanceId,
    ]));
  });
});
