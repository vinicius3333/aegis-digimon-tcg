import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-070.js";

describe("BT23-070 Belphemon (X Antibody)", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-070")).toMatchObject({
      cardId: "BT23-070",
      nameEn: "Belphemon (X Antibody)",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 6 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "X Antibody", "Seven Great Demon Lords"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("exposes Rush and Piercing through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-070", as: "belphemon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("belphemon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("belphemon"))).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword)),
    ).toEqual(["Rush", "Piercing"]);
  });

  it("while suspended deletes all highest-level opponents, mandatorily attacks without suspending, then evolves into Sleep Mode from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-070", under: ["BT13-088"], as: "belphemon", suspended: true }],
          trash: [{ card: "EX10-021", as: "sleep" }],
        },
        1: {
          battleArea: [
            { card: "BT23-068", as: "high1" },
            { card: "BT23-069", as: "high2" },
            { card: "BT23-063", as: "low" },
          ],
          security: ["BT1-028", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowId = s.perm("low").permanentId;
    const memoryBefore = s.state.memory;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("belphemon"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(lowId);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("belphemon").isSuspended).toBe(true);
    expect(s.perm("belphemon").topCard?.cardId).toBe("EX10-021");
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("deletes all opposing highest-level Digimon and attacks without suspending when Belphemon is in its stack", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "highestLevel" }, count: "all" },
    });
    expect(actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "attacks without suspending",
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
    expect(actions[2]).toMatchObject({
      kind: "Attack",
      withoutSuspending: true,
      mandatory: true,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });

  it("can digivolve into Belphemon: Sleep Mode from trash after attacking", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "EndOfAttack") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: false,
      ignoreRequirements: true,
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Belphemon: Sleep Mode"], match: "name" }] },
    });
  });

  it("requires a level 6 Belphemon without the X Antibody trait for the alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, names: ["Belphemon"], excludeTraits: ["X Antibody"], cost: 2, isAlternate: true },
    ]);
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT13-088", as: "base" }], hand: [{ card: "BT23-070", as: "x" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("x").instanceId,
      }),
    ).toEqual({ ok: true });
    const excluded = setupEngine({
      0: { battleArea: [{ card: "BT23-070", as: "base" }], hand: [{ card: "BT23-070", as: "x" }] },
    });
    expect(
      excluded.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: excluded.perm("base").permanentId,
        instanceId: excluded.inst("x").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
