import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT14-036.js";

describe("BT14-036", () => {
  it("gives an opposing Digimon -3000 DP on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }));
  it("inherits once-per-turn -2000 DP when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }] }));

  it("reduces an opposing Digimon by 3000 DP when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-033", as: "base" }], hand: [{ card: "BT14-036", as: "centaru" }] },
      1: { battleArea: [{ card: "BT1-015", as: "target" }] },
    }, { autoSelectCards: true });
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("centaru").instanceId })).toEqual({ ok: true });
    const target = () => s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId);
    await settle(() => target()?.currentDP === 1000);
    expect(target()?.currentDP).toBe(1000);
  });
});
