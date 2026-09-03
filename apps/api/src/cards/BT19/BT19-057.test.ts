import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-057 Sparrowmon", () => {
  it("When Attacking may evolve into exact RaptorSparrowmon under a Tamer at no cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow" },
            { card: "BT19-083", as: "tamer", under: ["BT19-061"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("sparrow"), {
      attackerPermanentId: s.perm("sparrow").permanentId,
    });
    expect(s.perm("sparrow").topCard?.cardId).toBe("BT19-061");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual([]);
    expect(s.state.memory).toBe(0);
  });

  it("may decline its attack evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow" },
            { card: "BT19-083", as: "tamer", under: ["BT19-061"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("sparrow"), {
      attackerPermanentId: s.perm("sparrow").permanentId,
    });
    expect(s.perm("sparrow").topCard?.cardId).toBe("BT19-057");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-061"]);
  });

  it("resolves attack evolution from a public attack intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow" },
            { card: "BT19-083", as: "tamer", under: ["BT19-061"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sparrow").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sparrow").topCard?.cardId === "BT19-061");
    expect(s.perm("sparrow").topCard?.cardId).toBe("BT19-061");
  });

  it("Save places deleted Sparrowmon under its controller's Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow" },
            { card: "BT19-083", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const selfId = s.perm("sparrow").topCard!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("sparrow").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === selfId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === selfId)).toBe(false);
  });

  it("inherits Collision only on an Xros Heart host during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-061", as: "host", under: ["BT19-057"] },
          { card: "BT19-046", as: "other", under: ["BT19-057"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Collision")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Collision")).toBe(false);
  });
});
