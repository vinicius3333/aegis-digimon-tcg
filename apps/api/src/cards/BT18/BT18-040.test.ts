import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-040.js";

describe("BT18-040 Dynasmon", () => {
  it("has Raid and pays the exact security cost to give an opponent -6000 DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-040", as: "dynasmon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-060", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 5)).toMatchObject([
      { trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] },
      { trigger: "Static", keywords: [{ keyword: "Raid" }] },
      ...["OnPlay", "WhenDigivolving", "WhenAttacking"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "ModifyDP",
            amount: -6000,
            duration: "untilOpponentTurnEnd",
            cost: { kind: "trashSecurityTop" },
            optional: true,
            abortOnDecline: true,
          },
        ],
      })),
    ]);
    expect(compiled.effects?.[5]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 4000 }, while: { value: 3, op: "lte" } },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } }, while: { value: 3, op: "lte" } },
      ],
    });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(observe(s.engine).hasKeyword(s.perm("dynasmon"), "Raid")).toBe(true);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(4000);
    assertNoLoudGap(s);
  });

  it("digivolves from yellow level 5 for 4 and resolves the same paid -6000 DP effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-038", as: "arkhai" }],
          hand: [{ card: "BT18-040", as: "dynasmon" }],
          deck: ["BT1-009"],
          security: [{ card: "BT1-010", as: "securityCost" }],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("arkhai").permanentId,
        instanceId: s.inst("dynasmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("arkhai").topCard?.instanceId === s.inst("dynasmon").instanceId && s.perm("target").currentDP === 4000,
    );

    expect(s.state.memory).toBe(6);
    expect(s.perm("arkhai").stack.map(({ cardId }) => cardId)).toEqual(["BT18-038"]);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("securityCost").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("pays top security to apply -6000 DP when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-040", as: "dynasmon" }],
          security: [{ card: "BT1-009", as: "securityCost" }],
        },
        1: {
          battleArea: [{ card: "BT1-060", as: "target", dp: 10000 }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dynasmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("securityCost").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("Blast Digivolves from hand during the natural opponent Counter Timing without memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 10000 }] },
        1: {
          battleArea: [{ card: "BT1-060", as: "base" }],
          hand: [{ card: "BT18-040", as: "dynasmon" }],
          security: [{ card: "BT1-001", as: "securityCost" }, "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("dynasmon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-040");

    expect(s.perm("base").topCard?.cardId).toBe("BT18-040");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("securityCost").instanceId)).toBe(
      true,
    );
    expect(s.perm("attacker").currentDP).toBe(4000);
    assertNoLoudGap(s);
  });

  it.each([
    [3, 16000, true],
    [4, 12000, false],
  ])("has %i security: resolves to %i DP and Blocker=%s", async (security, expectedDp, blocker) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-040", as: "dynasmon" }], security } });
    await s.ready();

    expect(s.perm("dynasmon").currentDP).toBe(expectedDp);
    expect(observe(s.engine).hasKeyword(s.perm("dynasmon"), "Blocker")).toBe(blocker);
    assertNoLoudGap(s);
  });

  it("may decline without paying security or changing DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-040", as: "dynasmon" }], security: [{ card: "BT1-009", as: "security" }] },
        1: { battleArea: [{ card: "BT1-060", as: "target", dp: 10000 }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("dynasmon").topCard?.cardId === "BT18-040");

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.perm("target").currentDP).toBe(10000);
    assertNoLoudGap(s);
  });

  it("applies Overflow -4 when Dynasmon ACE leaves the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-040", as: "dynasmon" }] } });
    s.state.memory = 5;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("dynasmon").permanentId])).toBe(1);

    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });
});
