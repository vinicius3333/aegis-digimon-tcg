import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-048.js";

describe("BT18-048 Kazemon", () => {
  it("suspends the exact opposing Digimon when digivolving from Zoe Orimoto", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-090", as: "zoe" }], hand: [{ card: "BT18-048", as: "kazemon" }] },
      1: { battleArea: [{ card: "BT1-030", as: "opponentTarget" }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("zoe").permanentId, instanceId: s.inst("kazemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("zoe").topCard?.cardId === "BT18-048");
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("zoe"));

    expect(s.perm("zoe").topCard?.cardId).toBe("BT18-048");
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
  });
});
