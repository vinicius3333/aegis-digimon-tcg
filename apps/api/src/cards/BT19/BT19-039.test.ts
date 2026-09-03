import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-039 SkullBaluchimon", () => {
  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s may trash top security to delete level 4 or lower and gain 1 memory",
    async (timing) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT19-039", as: "skull" }], security: ["BT19-030", "BT19-031"] },
          1: {
            battleArea: [
              { card: "BT19-020", as: "level4" },
              { card: "BT19-038", as: "level5" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;
      await advance(s.engine).fireForPermanent(timing, s.perm("skull"));
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-031"]);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-030");
      expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-038"]);
      expect(s.state.memory).toBe(1);
    },
  );

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s may decline the security cost and then neither deletes nor gains memory",
    async (timing) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT19-039", as: "skull" }], security: ["BT19-030"] },
          1: { battleArea: [{ card: "BT19-020", as: "target" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;
      await advance(s.engine).fireForPermanent(timing, s.perm("skull"));
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.state.players[1]!.battleArea).toHaveLength(1);
      expect(s.state.memory).toBe(0);
    },
  );

  it("On Deletion recovers exactly the top deck card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-039", as: "skull" }],
          deck: ["BT19-030", "BT19-031"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("skull").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-030"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-031"]);
  });

  it("inherited effect may unsuspend its host once per turn only when controller security is reduced", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT19-040", as: "host", under: ["BT19-039"], suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("host").isSuspended).toBe(true);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("host").isSuspended).toBe(false);
    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("resolves On Play security payment from a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-039", as: "skull" }],
          security: ["BT19-030"],
        },
        1: { battleArea: [{ card: "BT19-020", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
