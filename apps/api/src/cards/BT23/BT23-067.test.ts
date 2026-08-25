import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-067.js";

describe("BT23-067 LadyDevimon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-067")).toMatchObject({
      cardId: "BT23-067",
      nameEn: "LadyDevimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 3 },
        { color: "Yellow", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Fallen Angel", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays 4 from hand with either Angewomon or Mirei and pays 7 without them", async () => {
    for (const enabler of ["BT23-031", "BT22-089"]) {
      const reduced = setupEngine({
        0: { battleArea: [{ card: enabler }], hand: [{ card: "BT23-067", as: "lady" }] },
      });
      reduced.state.memory = 10;
      expect(reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("lady").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-067"),
      );
      expect(reduced.state.memory).toBe(6);
    }
    const full = setupEngine({ 0: { hand: [{ card: "BT23-067", as: "lady" }] } });
    full.state.memory = 10;
    expect(full.engine.applyIntent(0, { type: "playCard", instanceId: full.inst("lady").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => full.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-067"));
    expect(full.state.memory).toBe(3);
  });

  it("deletes only an opposing level-4-or-lower Digimon on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-067", as: "lady" }] },
      1: {
        battleArea: [
          { card: "BT23-063", as: "low" },
          { card: "BT23-068", as: "high" },
        ],
      },
    });
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("lady").permanentId });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(true);
  });

  it("reduces its hand play cost by 3 when you have Angewomon or Mirei Mikagura", () => {
    const replacement = (
      compiled.effects.find((entry) => entry.trigger === "Static" && entry.actions.length > 0) as any
    ).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: { nameOrTrait: [{ tokens: ["Angewomon", "Mirei Mikagura"], match: "name" }] },
          },
        },
      ],
    });
  });

  it("exposes Blocker directly and Scapegoat from a realistic inherited stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-067", as: "lady" },
          { card: "BT23-068", under: ["BT23-067"], as: "carrier" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("lady"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Scapegoat")).toBe(true);
    const staticEffects = compiled.effects.filter((entry) => entry.trigger === "Static");
    expect(staticEffects.flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? [])).toEqual([
      "Blocker",
      "Scapegoat",
    ]);
    expect(staticEffects.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Scapegoat");
  });

  it("deletes one opposing level 4 or lower Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } }, count: 1 },
      });
    }
  });

  it("requires a level 4 CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-050", as: "base" }], hand: [{ card: "BT23-067", as: "lady" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT23-067", as: "lady" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("lady").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
