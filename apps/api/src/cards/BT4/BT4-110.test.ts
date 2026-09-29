import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-110.js";

describe("BT4-110 Dark Roar", () => {
  it("raises the deletion ceiling by 1 for each D-Brigade Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT4-063", "BT4-067"], hand: [{ card: "BT4-110", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT4-067", as: "costFive" },
            { card: "BT4-069", as: "costSix" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("costSix").permanentId);
  });

  it("activates the scaled Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT4-063"], security: [{ card: "BT4-110", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT4-039", as: "costFour" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("BT4-110 Dark Roar — KB Q&A rulings", () => {
  async function playDarkRoar(ownDigimon: string[], opponentDigimon: { card: string; as: string }[]) {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      { 0: { battleArea: ownDigimon, hand: [{ card: "BT4-110", as: "option" }] }, 1: { battleArea: opponentDigimon } },
      { autoSelectCards: true, preferInstanceIds },
    );
    // The auto-picker prefers the costliest Digimon, so a cap that is one too high would delete it.
    const costliest = opponentDigimon.at(-1)!;
    preferInstanceIds.push(s.perm(costliest.as).topCard!.instanceId);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-110"));
    return s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId);
  }

  it("raises the maximum play cost to 3 plus the number of own D-Brigade Digimon (Q1277)", async () => {
    const costFour = { card: "BT4-039", as: "costFour" };
    const costFive = { card: "BT4-067", as: "costFive" };
    const costSix = { card: "BT4-069", as: "costSix" };

    expect(await playDarkRoar(["BT4-069"], [costFour])).toEqual(["BT4-039"]);
    expect(await playDarkRoar(["BT4-063"], [costFour, costFive])).toEqual(["BT4-067"]);
    expect(await playDarkRoar(["BT4-063", "BT4-063"], [costFive, costSix])).toEqual(["BT4-069"]);
    expect(await playDarkRoar(["BT4-063", "BT4-063", "BT4-063"], [costSix])).toEqual([]);
  });
});
