import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT16-018.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT16-018", () => {
  it("prevents battle deletion on play and when digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Restrict", restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Restrict", restriction: "beDeletedInBattle" }],
    });
  });
  it("gains +2000 DP as an inherited your-turn effect", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    }));

  it("prevents the chosen Digimon from being deleted in battle after On Play", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-018", as: "source" },
            { card: "BT16-017", as: "ally" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.perm("ally").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(observe(s.engine).isRestricted(s.perm("ally"), "beDeletedInBattle")).toBe(true);
  });

  it("applies the inherited +2000 DP your-turn bonus in the live engine", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-019", as: "host", dp: 6000, under: ["BT16-018"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(8000);
  });
});
