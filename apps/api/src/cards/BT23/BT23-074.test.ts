import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-074.js";

describe("BT23-074 Eater Legion", () => {
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

  it("keeps Alliance and Reboot as continuous static keywords", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((k) => k.keyword)),
    ).toEqual(["Alliance", "Reboot"]);
  });
});
