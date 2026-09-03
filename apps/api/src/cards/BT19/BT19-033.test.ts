import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-033 Dorulumon", () => {
  it("naturally resolves On Play evolution when played from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-033", as: "doru" }],
          battleArea: [{ card: "BT19-083", as: "tamer", under: ["BT19-038"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("doru").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-038"));
    expect(s.perm("doru").stack.map((card) => card.cardId)).toEqual(["BT19-033"]);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("On Play may freely evolve into JaegerDorulumon from under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-033", as: "doru" },
            { card: "BT19-083", as: "tamer", under: ["BT19-038", "BT19-035"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("doru"));
    expect(s.perm("doru").topCard?.cardId).toBe("BT19-038");
    expect(s.perm("doru").stack.map((card) => card.cardId)).toEqual(["BT19-033"]);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-035"]);
    expect(s.state.memory).toBe(0);
  });

  it("may decline the On Play evolution without moving a Tamer source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-033", as: "doru" },
            { card: "BT19-083", as: "tamer", under: ["BT19-038"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("doru"));
    expect(s.perm("doru").topCard?.cardId).toBe("BT19-033");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-038"]);
  });

  it("Save places deleted Dorulumon under a controller Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-033", as: "doru" },
            { card: "BT19-083", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("doru").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT19-033"));
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-033"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-033")).toBe(false);
  });

  it("inherited Piercing applies only to an Xros Heart host on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-038", as: "host", under: ["BT19-033"] },
          { card: "BT19-015", as: "nonmatching", under: ["BT19-033"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("nonmatching"))).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
  });
});
