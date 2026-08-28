import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-074.js";

describe("BT23-074 Eater Legion", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-074")).toMatchObject({
      cardId: "BT23-074",
      nameEn: "Eater Legion",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 8,
      dp: 8000,
      evoCosts: [],
      forms: ["Eater"],
      attributes: ["-"],
      types: ["Hudie", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Erika Mishima"], cost: 3, isAlternate: true }]);
  });

  it("plays up to 6 total cost of Eater Digimon only while Mother Eater is in breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-074", as: "legion" }],
          breeding: { card: "BT22-007", as: "mother" },
          hand: [
            { card: "BT23-073", as: "eater1" },
            { card: "BT23-073", as: "eater2" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eaterIds = [s.inst("eater1").instanceId, s.inst("eater2").instanceId];
    const plainId = s.inst("plain").instanceId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("legion").permanentId });

    expect(s.state.players[0]!.battleArea.filter((p) => eaterIds.includes(p.topCard?.instanceId ?? ""))).toHaveLength(
      2,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === plainId)).toBe(true);
  });

  it("does not play an Eater when Mother Eater is absent from breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-074", as: "legion" }],
          hand: [{ card: "BT23-073", as: "eater" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eaterId = s.inst("eater").instanceId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.WhenDigivolving, { subjectPermanentId: s.perm("legion").permanentId });

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === eaterId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("requires Mother Eater in the breeding area for both play windows", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "PlayMultiple",
        totalCost: 6,
        from: "hand",
        optional: true,
        condition: { kind: "youHave", filter: { zone: "breeding" } },
      });
      expect(action.filter.nameOrTrait).toEqual([{ tokens: ["Eater"], match: "trait" }]);
    }
  });

  it("keeps Alliance and Reboot as live continuous keywords", async () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((k) => k.keyword)),
    ).toEqual(["Alliance", "Reboot"]);

    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-074", as: "legion" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("legion"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("legion"), "Reboot")).toBe(true);
  });
});
