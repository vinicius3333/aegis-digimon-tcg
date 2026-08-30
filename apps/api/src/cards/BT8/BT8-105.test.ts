import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-105.js";

describe("BT8-105 Dark Gaia Force", () => {
  it("deletes any number of Digimon within the combined play-cost budget", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT8-011"], hand: [{ card: "BT8-105", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT8-011", as: "fiveCost" },
            { card: "BT8-017", as: "tenCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes one opposing Digimon costing 15 or less from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT8-105", as: "option", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT8-032", as: "target" },
            { card: "BT8-017", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("requires at least one deletion after activating Main, even when later picks are optional", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT8-011"], hand: [{ card: "BT8-105", as: "option" }] },
        1: { battleArea: [{ card: "BT8-011", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
