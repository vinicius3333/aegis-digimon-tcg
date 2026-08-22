import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT24_031 } from "./BT24-031.js";
import "../index.js";

describe("BT24-031 Elecmon", () => {
  it("recovers only after the optional top-security add leaves zero security", () => {
    const inherited = BT24_031.effects?.find((entry) => entry.isInherited);
    const recovery = inherited?.actions?.[1] as any;
    expect(recovery).toMatchObject({ kind: "SecurityManipulation", op: "addTop", source: "deck" });
    expect(recovery.condition).toMatchObject({
      kind: "zoneCount",
      seat: "mine",
      zone: "security",
      op: "lte",
      value: 0,
    });
  });
  it("reveals the two printed search pools on play", () => {
    const reveal = BT24_031.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add).toHaveLength(2);
  });

  it("adds distinct Iliad and TS cards from the top three and bottoms the miss", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-031", as: "elecmon" }],
          deck: [
            { card: "BT24-102", as: "iliad" },
            { card: "BT24-083", as: "ts" },
            { card: "BT1-001", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("elecmon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("iliad").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("may recover from the deck while starting at zero security (Q5611)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-032", as: "host", under: ["BT24-031"] }],
          deck: [{ card: "BT1-001", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("adds the top security to hand, recovers, and does not repeat in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-032", as: "host", under: ["BT24-031"] }],
          security: [{ card: "BT1-001", as: "added" }],
          deck: [
            { card: "BT1-002", as: "recovered" },
            { card: "BT1-003", as: "unused" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("added").instanceId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("unused").instanceId]);
  });
});
