import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-044.js";

describe("BT13-044 BanchoLeomon", () => {
  it("uses the top security card for the DP reduction and reacts to security removal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          amount: -6000,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("trashes the top security card and reduces one opposing Digimon by 6000", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-041", as: "base" }],
          hand: [{ card: "BT13-044", as: "bancho" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bancho").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 7000);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.some((card) => card.cardId === "BT13-041")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("exposes Blocker and its evolution security payment may play one yellow Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-041", as: "base" }],
          hand: [
            { card: "BT13-044", as: "bancho" },
            { card: "BT13-098", as: "richard" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bancho").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-098"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.state.memory).toBe(before - 3);
    expect(s.perm("base").stack.some((card) => card.cardId === "BT13-041")).toBe(true);
  });

  it("ignores opponent security removal, suppresses same-turn duplicates, then resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-044", as: "bancho" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          hand: [
            { card: "BT13-098", as: "richard1" },
            { card: "BT13-095", as: "marcus" },
            { card: "BT13-098", as: "richard2" },
          ],
          deck: [{ card: "BT1-012", as: "drawnNeutral" }, "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker", dp: 20000 },
            { card: "BT1-010", as: "secondAttacker", dp: 20000 },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const openingTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    const attackAndDeclineBlock = async (attacker: string, expectedSecurity: number): Promise<void> => {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      const previousBlockWindows = s.events.filter((event) => event.kind === "blockWindowOpened").length;
      await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length > previousBlockWindows);
      expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.security.length === expectedSecurity);
    };

    await attackAndDeclineBlock("firstAttacker", 2);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    await attackAndDeclineBlock("secondAttacker", 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("richard1").instanceId)).toBe(
      true,
    );

    advance(s.engine).endMainPhaseIfOpen(1);
    await openingTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await attackAndDeclineBlock("firstAttacker", 0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("richard2").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnNeutral").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("marcus").instanceId)).toBe(true);
  });

  it("does not play a non-yellow Tamer and cannot debuff without security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-041", as: "base" }],
          hand: [
            { card: "BT13-044", as: "bancho" },
            { card: "BT13-097", as: "blueTamer" },
          ],
          deck: ["BT1-012"],
        },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const baseDP = s.perm("target").currentDP;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bancho").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-044");
    await settle();
    expect(s.perm("target").currentDP).toBe(baseDP);
    expect(s.perm("base").stack.some((card) => card.cardId === "BT13-041")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blueTamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-012")).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("may decline the evolution security payment without trashing or reducing DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-041", as: "base" }],
          hand: [{ card: "BT13-044", as: "bancho" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const baseDP = s.perm("target").currentDP;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bancho").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-044");
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(baseDP);
    expect(s.state.memory).toBe(3);
  });

  it("digivolves from a yellow level 5 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-041", as: "base" }], hand: [{ card: "BT13-044", as: "bancho" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bancho").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-044");
    expect(s.state.memory).toBe(1);
  });
});
