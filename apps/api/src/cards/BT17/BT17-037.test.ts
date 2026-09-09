import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT15/BT15-097.js";
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
          actions: [
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              from: ["trash"],
              toTop: true,
              // Printed `[Marcus Damon]` is an exact name reference: "Marcus Damon & Agumon"
              // (AD1-021) must not qualify.
              source: {
                filter: {
                  zone: "trash",
                  nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }],
                },
                count: 1,
              },
            },
          ],
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
          security: ["BT1-009"],
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
            { card: "BT17-034", as: "inheritedHost", under: ["BT17-037"] },
            { card: "BT1-087", as: "yellowTamer" },
          ],
          trash: [{ card: "BT12-092", as: "marcus" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: ["BT15-055"],
          hand: [
            { card: "BT15-097", as: "slicer" },
            { card: "BT15-055", as: "machineCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const marcusId = s.inst("marcus").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("slicer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === marcusId));

    const securedMarcus = s.state.players[0]!.security.find((card) => card.instanceId === marcusId);
    expect(securedMarcus).toBeDefined();
    expect(securedMarcus?.faceUp).toBe(false);
  });

  it("grants +3000 DP and Piercing only on your turn while a Tamer is suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-037", as: "rize" },
          { card: "BT1-087", as: "tamer", suspended: true },
        ],
        hand: [{ card: "BT1-009", as: "spare" }],
      },
      1: { battleArea: [{ card: "BT1-020", as: "foe" }] },
    });
    await s.ready();

    expect(s.perm("rize").currentDP).toBe(10_000);
    expect(observe(s.engine).hasPierce(s.perm("rize"))).toBe(true);
    // Peer case: the aura is self-only, so the opposing Lv5 keeps its printed DP.
    expect(s.perm("foe").currentDP).toBe(6000);
    expect(observe(s.engine).hasPierce(s.perm("foe"))).toBe(false);

    await advance(s.engine).verb.unsuspend([s.perm("tamer").permanentId]);
    expect(s.perm("rize").currentDP).toBe(7000);
    expect(observe(s.engine).hasPierce(s.perm("rize"))).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    expect(s.perm("rize").currentDP).toBe(10_000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("rize").currentDP).toBe(7000);
    expect(observe(s.engine).hasPierce(s.perm("rize"))).toBe(false);
  });

  it("suspends a yellow Tamer when attacking and leaves a non-yellow Tamer alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-037", as: "rize" },
            { card: "BT1-087", as: "yellowTamer" },
            { card: "BT1-085", as: "redTamer" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        1: { battleArea: [{ card: "BT1-020", dp: 20_000, as: "foe", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rize").permanentId,
        target: { kind: "permanent", permanentId: s.perm("foe").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowTamer").isSuspended);

    // Cost filter is colour-scoped: only the yellow Tamer paid.
    expect(s.perm("redTamer").isSuspended).toBe(false);
    expect(s.perm("foe").currentDP).toBe(17_000);
  });

  it("ignores Marcus Damon & Agumon and fires only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-034", as: "host", under: ["BT17-037"] },
            { card: "BT1-087", as: "firstTamer" },
            { card: "BT1-085", as: "secondTamer" },
            { card: "BT1-087", as: "thirdTamer" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          trash: [
            { card: "AD1-021", as: "comboMarcus" },
            { card: "BT12-092", as: "marcus" },
            { card: "BT13-095", as: "laterMarcus" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"], hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const comboId = s.inst("comboMarcus").instanceId;
    const marcusId = s.inst("marcus").instanceId;
    const laterMarcusId = s.inst("laterMarcus").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("firstTamer").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security[0]?.instanceId === marcusId);

    // `[Marcus Damon]` is exact: "Marcus Damon & Agumon" stays in the trash.
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === comboId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);

    await advance(s.engine).verb.deletePermanent([s.perm("secondTamer").permanentId], "byEffect");
    await settle();

    // [Once Per Turn]: the second deletion this turn places nothing.
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === comboId)).toBe(true);

    // The real turn loop ends the turn; the once-per-turn use resets for the next one.
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    await advance(s.engine).verb.deletePermanent([s.perm("thirdTamer").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.security[0]?.instanceId).toBe(laterMarcusId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === comboId)).toBe(true);
  });
});
