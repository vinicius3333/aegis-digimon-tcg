import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-04.js";

describe("ST23-04 Murasamemon", () => {
  it("reduces an opponent Digimon by 5000 when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-03", as: "base" }], hand: [{ card: "ST23-04", as: "murasamemon" }], deck: ["BT1-002"] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }], deck: ["BT1-002"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("murasamemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST23-04" && s.perm("opponent").currentDP === 5000);
    expect(s.perm("base").topCard?.cardId).toBe("ST23-04");
    expect(s.perm("opponent").currentDP).toBe(5000);
  });

  it("retains the printed under-Tamer cost on the optional play and inherited unsuspend actions", () => {
    const card = runtimeCompiledCard("ST23-04");
    const actions = card?.effects.flatMap((effect) => effect.actions);
    expect(actions?.filter((action) => "cost" in action && action.cost !== undefined)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cost: expect.objectContaining({ kind: "trashBottomFaceDownUnderTamer" }) }),
      ]),
    );
    expect(card?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
  });
});
