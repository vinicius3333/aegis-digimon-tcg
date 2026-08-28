import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-071.js";

describe("BT23-071 Dullahamon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-071")).toMatchObject({
      cardId: "BT23-071",
      nameEn: "Dullahamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Ghost", "LIBERATOR"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      {
        names: ["Phantomon"],
        controllerControls: { kind: ["Tamer"], namesExact: ["Violet Inboots"], min: 1 },
        cost: 6,
        isAlternate: true,
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("must delete one opposing highest-level Digimon and leaves lower levels intact", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-071", as: "dullahamon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low" },
          { card: "BT23-101", as: "high" },
        ],
      },
    });
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.WhenDigivolving, {
      subjectPermanentId: s.perm("dullahamon").permanentId,
    });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(true);
  });

  it("exposes Piercing, Security Attack +1, and Execute through live seams", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-071", as: "dullahamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("dullahamon"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("dullahamon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("dullahamon"), "Execute")).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((k) => k.keyword)),
    ).toEqual(["Piercing", "SecurityAttack", "Execute"]);
  });

  it("gets +5000 DP when the chosen highest-level opponent prevents deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-071", as: "dullahamon" }] },
        1: {
          battleArea: [
            { card: "BT23-055", as: "protected" },
            { card: "BT23-100", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dullahamon"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-055")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT23-100")).toBe(true);
    expect(s.perm("dullahamon").currentDP).toBe(19000);
  });

  it("deletes the opponent's highest-level Digimon, otherwise gives itself +5000", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "highestLevel" } },
    });
    expect(actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: 5000,
      duration: "forTheTurn",
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
  });

  it("may play a level 6 or lower Ghost Digimon from trash on deletion", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnDeletion") as any).actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          levelComparison: { op: "lte", value: 6 },
          nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
        },
      },
    });
  });

  it("plays an eligible level-6 Ghost from trash on actual deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-071", as: "dullahamon" }],
          trash: [{ card: "BT23-069", as: "ghost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ghostId = s.inst("ghost").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("dullahamon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId)).toBe(true);
  });

  it("uses the cost-6 Phantomon path only while controlling Violet Inboots", () => {
    const legal = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-065", as: "base" },
          { card: "BT23-087", as: "violet" },
        ],
        hand: [{ card: "BT23-071", as: "dullahamon" }],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("dullahamon").instanceId,
      }),
    ).toEqual({ ok: true });
    const missing = setupEngine({
      0: { battleArea: [{ card: "BT23-065", as: "base" }], hand: [{ card: "BT23-071", as: "dullahamon" }] },
    });
    expect(
      missing.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: missing.perm("base").permanentId,
        instanceId: missing.inst("dullahamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
