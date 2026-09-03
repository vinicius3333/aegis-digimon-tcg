import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-047 Ballistamon", () => {
  it("requires the exact AtlurBallistamon name for its On Play evolution", () => {
    expect(runtimeCompiledCard("BT19-047")?.effects[0]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      into: {
        nameOrTrait: [{ tokens: ["AtlurBallistamon"], match: "nameExact" }],
      },
    });
  });

  it("On Play may freely evolve into AtlurBallistamon from under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-047", as: "ballista" },
            { card: "BT19-081", as: "tamer", under: ["BT19-051", "BT19-035"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("ballista"));
    expect(s.perm("ballista").topCard?.cardId).toBe("BT19-051");
    expect(s.perm("ballista").stack.map((card) => card.cardId)).toEqual(["BT19-047"]);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-035"]);
    expect(s.state.memory).toBe(0);
  });

  it("may decline the On Play evolution without moving a Tamer source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-047", as: "ballista" },
            { card: "BT19-081", as: "tamer", under: ["BT19-051"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("ballista"));
    expect(s.perm("ballista").topCard?.cardId).toBe("BT19-047");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-051"]);
  });

  it("resolves On Play evolution from a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-047", as: "ballista" }],
          battleArea: [{ card: "BT19-081", as: "tamer", under: ["BT19-051"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ballista").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-051"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-051")).toBe(true);
  });

  it("Save places deleted Ballistamon under a controller Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-047", as: "ballista" },
            { card: "BT19-081", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("ballista").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT19-047"));
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-047"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-047")).toBe(false);
  });

  it("inherited Blocker applies only to an Xros Heart host on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-051", as: "host", under: ["BT19-047"] },
          { card: "BT19-015", as: "nonmatching", under: ["BT19-047"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonmatching"), "Blocker")).toBe(false);
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });
});
