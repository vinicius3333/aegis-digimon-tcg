import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_083 } from "./BT24-083.js";
import "../index.js";

describe("BT24-083 Hiroko Sagisaka", () => {
  it("returns itself to deck bottom and offers Hiroko or a qualifying TS Digimon", () => {
    const start = BT24_083.effects?.find((entry) => entry.trigger === "StartOfYourTurn");
    expect(start?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", kind: ["Tamer"], namesExact: ["Hiroko Sagisaka"] },
        orFilters: [
          {
            kind: ["Digimon"],
            dp: { op: "lte", value: 5000 },
            nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
          },
        ],
      },
      cost: { kind: "return", to: "deckBottom" },
    });
    expect(BT24_083.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
    });
  });

  it("returns itself at 4 memory and plays a 5000-DP-or-less TS Digimon without a level ceiling", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "hiroko" }],
          hand: [
            { card: "BT24-022", as: "tooLarge" },
            { card: "BT24-013", as: "eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("tooLarge").instanceId, s.inst("eligible").instanceId);
    s.state.memory = 4;
    const sourceId = s.perm("hiroko").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourTurn, s.perm("hiroko"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("eligible").instanceId,
      ),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooLarge").instanceId);
  });

  it("does not return itself or play a card above 4 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "hiroko" }],
          hand: [{ card: "BT24-013", as: "eligible" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourTurn, s.perm("hiroko"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
  });

  it("reveals three, adds one TS card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-083", as: "hiroko" }],
          deck: [
            { card: "BT24-013", as: "ts" },
            { card: "BT1-001", as: "missA" },
            { card: "BT1-002", as: "missB" },
          ],
        },
      },
      { autoOrderCards: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("hiroko"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ts").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("missA").instanceId, s.inst("missB").instanceId]),
    );
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-083", as: "hiroko" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("hiroko"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("hiroko").instanceId),
    );
  });
});
