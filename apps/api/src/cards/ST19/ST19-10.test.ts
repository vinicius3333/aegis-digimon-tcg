import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-10.js";
import "./ST19-07.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("ST19-10 ExTyrannomon", () => {
  it("matches the alternate digivolution, DigiXros, Armor Purge, and inherited Barrier text", () => {
    expect(getCardDefinition("ST19-10")).toMatchObject({
      effectText: expect.stringContaining("＜Armor Purge＞"),
      inheritedEffectText: "＜Barrier＞.",
      evoCosts: expect.arrayContaining([
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ]),
    });
  });

  it("exposes Armor Purge and inherited Barrier after a legal stack is built", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST19-10", as: "exty", under: ["ST19-07"] }] },
      1: { battleArea: [] },
    });
    await s.ready();
    const p = s.perm("exty");
    expect(observe(s.engine).hasKeyword(p, "Armor Purge")).toBe(true);
    expect(observe(s.engine).hasKeyword(p, "Barrier")).toBe(true);
  });

  it("plays through the printed DigiXros -2 recipe with a named and Puppet Lv.4 material", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-016", as: "tyranno", dp: 5000 },
          { card: "ST19-07", as: "puppet", dp: 5000 },
        ],
        hand: [{ card: "ST19-10", as: "exty" }],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("exty").instanceId,
        digiXros: {
          materialInstanceIds: [s.perm("tyranno").topCard.instanceId, s.perm("puppet").topCard.instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await s.ready();
    const exty = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST19-10");
    expect(exty).toBeDefined();
    expect(exty?.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.perm("tyranno").topCard.instanceId, s.perm("puppet").topCard.instanceId]),
    );
    expect(s.state.memory).toBe(0);
  });
});
