import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-038.js";

describe("BT23-038 FunBeemon", () => {
  it("adds distinct Royal Base-in-text and CS cards and bottoms the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-038", as: "funbeemon" }],
          deck: [
            { card: "BT19-084", as: "royalBaseText" },
            { card: "BT23-049", as: "cs" },
            { card: "BT1-009", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const royalBaseId = s.inst("royalBaseText").instanceId;
    const csId = s.inst("cs").instanceId;
    const remainderId = s.inst("remainder").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("funbeemon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([royalBaseId, csId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(remainderId);
  });

  it("applies its inherited all-turns DP bonus to the carrier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-046", as: "carrier", under: ["BT23-038"] }] } });
    const baseDp = s.perm("carrier").currentDP;
    await s.ready();
    expect(s.perm("carrier").currentDP).toBe(baseDp + 1000);
  });

  it("grants +1000 DP to all Royal Base Digimon in Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isSecurity) as any;
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  it("reveals three cards and adds one Royal Base-in-text card plus one CS card", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(action).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Royal Base"], match: "text" }] },
          count: 1,
          to: "hand",
        },
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          count: 1,
          to: "hand",
        },
      ],
      rest: "deckBottom",
    });
  });

  it("inherits +1000 DP during all turns", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });
});
