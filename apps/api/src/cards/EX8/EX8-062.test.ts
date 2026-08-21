import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-062.js";

describe("EX8-062", () => {
  it("has Blast Digivolve and gives four opposing Digimon -2000 DP on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toHaveLength(4);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" });
  });
  it("has the all-turns deletion response that may play an NSo Digimon from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "SubTrigger" });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ sourceFilter: { controllerDefault: "both", excludeSelf: true }, actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }] });
  });
  it("applies the four sequential -2000 DP reductions to an opposing Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-062", as: "source" }] }, 1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] } }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });
  it("plays an eligible NSo Digimon from trash when another Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-062", as: "source" }], trash: ["BT26-062"] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-062"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-062")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT26-062")).toBe(false);
  });
});
