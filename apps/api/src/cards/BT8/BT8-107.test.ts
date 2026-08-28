import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-107.js";

describe("BT8-107 Pandemonium Flame", () => {
  it("uses the deleted Digimon's level as the opposing deletion limit", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-041", as: "cost" }], hand: [{ card: "BT8-107", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT8-023", as: "eligible" },
            { card: "BT8-032", as: "tooHigh" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("tooHigh").topCard.cardId).toBe("BT8-032");
  });

  it("deletes an opposing unsuspended Digimon from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT8-107", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT8-023", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("still allows the own-Digimon cost when no opposing target exists", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-041", as: "cost" }], hand: [{ card: "BT8-107", as: "option" }] },
        1: { battleArea: [] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 0 &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-107"),
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-107")).toBe(true);
  });
});
