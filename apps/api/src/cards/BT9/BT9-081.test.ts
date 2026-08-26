import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-081.js";
import "./BT9-081.js";
describe("BT9-081 DexDorugoramon", () => {
  it("matches catalog values, alternate evolution, and Dex-inclusive deletion IR", () => {
    expect(getCardDefinition("BT9-081")).toMatchObject({
      colors: ["Purple", "Black"], level: 6, playCost: 13, dp: 13000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 5 }, { color: "Black", level: 5, memoryCost: 5 }],
      types: ["Undead", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Dorugoramon"], cost: 2, isAlternate: true }],
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestLevel" }, count: "all" }, condition: { kind: "anyOf" } }] },
        { trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { levels: [3], colors: ["Purple", "Black"] }, orFilters: [{ nameOrTrait: [{ tokens: ["DeathXmon"], match: "nameExact" }], ownerTrashNameCountGte: { count: 5, tokens: ["Dex", "DeathX"] } }] } }] },
      ],
    });
  });

  it("does not prompt for an ineligible DeathXmon below the five-name threshold", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-081", as: "dexDorugoramon" }],
        trash: [{ card: "BT9-112", as: "deathXmon" }],
      },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("dexDorugoramon").permanentId]);

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("deathXmon").instanceId)).toBe(
      true,
    );
  });

  it("plays DeathXmon once five Dex or DeathX names are in trash, including itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-081", as: "dexDorugoramon" }],
          trash: [{ card: "BT9-112", as: "deathXmon" }, "BT9-075", "BT9-078", "BT9-106"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("dexDorugoramon").permanentId]);

    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("deathXmon").instanceId),
    ).toBe(true);
  });

  it("plays only one level 3 instead of also playing DeathXmon at the threshold", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-081", as: "dexDorugoramon" }],
          trash: [
            { card: "BT9-070", as: "level3" },
            { card: "BT9-112", as: "deathXmon" },
            "BT9-075",
            "BT9-078",
            "BT9-106",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("dexDorugoramon").permanentId]);

    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("level3").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("deathXmon").instanceId)).toBe(
      true,
    );
  });

  it("deletes all opposing Digimon tied for the lowest level", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-065", as: "base" }], hand: [{ card: "BT9-081", as: "evolving" }] },
        1: { battleArea: ["BT1-010", "BT1-011", "BT2-047"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.topCard?.cardId).toBe("BT2-047");
  });

  it("does not treat DexDorugoramon as the exact Dorugoramon source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-081", as: "dex", under: ["BT9-081"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dex"));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("target").permanentId)).toBe(
      true,
    );
  });
});
