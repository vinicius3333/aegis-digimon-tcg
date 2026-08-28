import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/BT5/BT5-110.js";
import { compiled } from "./BT17-037.js";
import "./index.js";

describe("BT17-037 RizeGreymon", () => {
  it("gains DP and Piercing with a suspended Tamer", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "Aura",
      effect: { kind: "modifyDP", amount: 3000 },
      while: { kind: "youHave", filter: { controllerDefault: "mine", suspended: true, kind: ["Tamer"] } },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
      while: { kind: "youHave", filter: { controllerDefault: "mine", suspended: true, kind: ["Tamer"] } },
    });
  });

  it("suspends a yellow Tamer to reduce one opposing Digimon by 3000 when digivolving or attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -3000,
        cost: {
          kind: "suspend",
          target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 },
        },
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
  });

  it("once per turn places Marcus Damon from trash on top of security after a red or yellow Tamer is deleted", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "onDeletionOf",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
          actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["trash"], toTop: true }],
        },
      ],
    });
  });

  it("suspends a yellow Tamer on digivolution, reduces DP, and enables its aura", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-034", as: "base" },
            { card: "BT1-087", as: "tamer" },
          ],
          hand: [{ card: "BT17-037", as: "rize" }],
        },
        1: { battleArea: [{ card: "BT1-020", dp: 6000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rize").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("base").currentDP).toBe(10000);
  });

  it("places the deleted Marcus Damon itself on top of security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-040", under: ["BT17-037"], as: "host" },
            { card: "BT12-092", as: "marcus" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const marcusId = s.perm("marcus").topCard!.instanceId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("marcus").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security[0]?.instanceId === marcusId);

    expect(s.state.players[0]!.security[0]?.faceUp).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === marcusId)).toBe(false);
  });

  it("naturally reacts when an Option effect deletes a red or yellow Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-037", as: "rize" },
            { card: "BT5-086", as: "omnimon", under: ["BT5-014"] },
            { card: "BT5-059", as: "purpleSource" },
            { card: "BT1-087", as: "yellowTamer" },
          ],
          hand: [{ card: "BT5-110", as: "allDelete" }],
          trash: [{ card: "BT12-092", as: "marcus" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const marcusId = s.inst("marcus").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("allDelete").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === marcusId));

    expect(s.state.players[0]!.security[0]?.instanceId).toBe(marcusId);
    expect(s.state.players[0]!.security[0]?.faceUp).toBe(false);
  });
});
