import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-064.js";

describe("BT23-064 Bakemon", () => {
  it("deletes one own Digimon as cost before deleting an opposing level 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-064", as: "bakemon" },
            { card: "BT23-061", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT23-063", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await (s.engine as unknown as {
      fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
    }).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("bakemon").permanentId });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("requires deleting one of your Digimon to delete one opposing level 4 or lower Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } }, count: 1 },
        cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("gains 1 memory as an inherited On Deletion effect", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnDeletion") as any;
    expect(effect).toMatchObject({ isInherited: true, actions: [{ kind: "GainMemory", amount: 1 }] });
  });
});
