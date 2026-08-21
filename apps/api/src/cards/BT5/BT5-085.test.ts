import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-084.js";
import "./BT5-085.js";
import "./BT5-087.js";

describe("BT5-085 Armageddemon", () => {
  it("deletes a Diaboromon to reduce its play cost by 12 and enters with Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-084", as: "diaboromon" }],
          hand: [{ card: "BT5-085", as: "armageddemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // Immediate validation must be able to cover the printed 15 before the
    // interactive -12 reducer resolves; memory 5 has an affordability ceiling of 15.
    s.state.memory = 5;
    const diaboromonId = s.perm("diaboromon").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armageddemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("armageddemon").instanceId));
    await s.engine.recomputeContinuousEffects();

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("armageddemon").instanceId)!;
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === diaboromonId)).toBe(false);
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
  });

  it("prevents level 7 Digimon from activating When Digivolving effects", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-085", as: "armageddemon" }] },
      1: { battleArea: [{ card: "BT5-087", as: "level7" }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("level7"), "cannotActivateWhenDigivolving")).toBe(true);
  });
});
