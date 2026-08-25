import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_024 } from "./BT25-024.js";
import "../index.js";

describe("BT25-024 Lekismon", () => {
  it("draws one on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_024.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([{ kind: "Draw", controller: "mine", amount: 1 }]);
    }
  });

  it("draws the top deck card through its live On Play effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-024", as: "lekismon" }], deck: [{ card: "BT1-009", as: "drawn" }] },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lekismon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("offers Crescemon from hand only for red own Digimon events", () => {
    const effect = BT25_024.effects?.find((entry) => entry.trigger === "YourTurn");
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"] as const) {
      const watcher = effect?.actions?.find((action) => action.kind === "SubTrigger" && action.event === event);
      expect(watcher).toMatchObject({
        sourceFilter: { controller: "mine", kind: ["Digimon"] },
        fireCondition: { kind: "triggerSubjectHasColor", value: "Red" },
      });
      const subTrigger = watcher as { actions?: unknown[] } | undefined;
      expect(subTrigger?.actions?.[0]).toMatchObject({
        kind: "Digivolve",
        into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Crescemon"], match: "name" }] },
        from: ["hand"],
        reduceCost: 1,
        optional: true,
      });
    }
  });

  it("preserves inherited Jamming", () => {
    expect(BT25_024.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }),
      ]),
    );
  });
});
