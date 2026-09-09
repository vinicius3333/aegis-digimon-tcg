import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../EX2/EX2-066.js";
import { compiled } from "./BT17-038.js";
import "./index.js";

// BT17-038 Sakuyamon (Digimon, Lv6, Yellow)
//   [Digivolve][Sakuyamon: Maid Mode]: Cost 1 (no "in name" -> namesExact route)
//   ＜Barrier＞
//   [When Digivolving] 1 of your opponent's Digimon gets -6000 DP for the turn. Then, you
//     may use 1 Option card with [Plug-In] in its name or 1 yellow Option card with a cost
//     of 5 or less from your hand without paying the cost.
//   [Your Turn][Once Per Turn] When you use an Option card with a cost of 2 or more, this
//     Digimon can't be returned to hand or deck by your opponent's effects until the end of
//     their turn.
// Fixtures: normal route source BT17-035 Taomon (Lv5 Yellow); alternate route source
//   BT10-041 Sakuyamon: Maid Mode (Lv6 Yellow); BT1-102 Blade of the True (Yellow cost-2
//   Option); ST3-13 Heaven's Gate (Yellow cost-1 Option); EX2-066 Offensive Plug-In A (Red
//   cost-2 Plug-In); opponents are inert main-deck Digimon.
describe("BT17-038 Sakuyamon", () => {
  it("matches the catalog printed text and full IR contract", () => {
    expect(getCardDefinition("BT17-038")).toMatchObject({
      cardId: "BT17-038",
      nameEn: "Sakuyamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      types: ["Shaman"],
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    // Route models the printed "[Sakuyamon: Maid Mode]: Cost 1" as an exact-name alternate.
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Sakuyamon: Maid Mode"], cost: 1, isAlternate: true },
    ]);

    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(whenDigivolving?.actions?.[1]).toMatchObject({
      kind: "UseOptionWithoutCost",
      optional: true,
      payCost: false,
      allowMultiColor: true,
      filter: {
        controller: "mine",
        kind: ["Option"],
        playCostLte: 99,
        or: [{ nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] }, { colors: ["Yellow"], playCostLte: 5 }],
      },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [
            {
              kind: "Restrict",
              restriction: "beReturned",
              duration: "untilOpponentTurnEnd",
              byOpponentEffectsOnly: true,
              target: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("digivolves through the printed Sakuyamon: Maid Mode route for 1", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: undefined,
          battleArea: [{ card: "BT10-041", as: "base" }],
          hand: [
            { card: "BT17-038", as: "sakuyamon" },
            { card: "BT1-011", as: "spare" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const sakuyamonId = s.inst("sakuyamon").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sakuyamonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === sakuyamonId);

    // Reduced route: memory paid 1 (3 -> 2), the source sits beneath as a digivolution card,
    // and the digivolve bonus draw landed.
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard?.instanceId).toBe(sakuyamonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Barrier")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a near-name Sakuyamon base on both the exact route and the Lv5 route", async () => {
    // BT5-044 is named "Sakuyamon" (not "Sakuyamon: Maid Mode") and is Lv6, so it satisfies
    // neither the exact-name route nor the Lv5-Yellow evoCost. namesExact refuses it; the
    // substring `names` form would refuse it too here (no catalog name is a strict superstring
    // of the route name), so this pins routing without depending on that distinction.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-044", as: "base" }],
        hand: [{ card: "BT17-038", as: "sakuyamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const sakuyamonId = s.inst("sakuyamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sakuyamonId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sakuyamonId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.perm("base").topCard?.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([sakuyamonId]);
    expect(s.state.memory).toBe(5);
  });

  it("reduces DP, uses a free cost-2 yellow Option, and locks itself against opponent return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-035", as: "base" }],
          hand: [
            { card: "BT17-038", as: "sakuyamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-020", dp: 9000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("target").currentDP === 3000 && s.state.players[0]!.hand.some((card) => card.instanceId === drawnId),
    );

    // Normal Lv5-Yellow route paid 3 (3 -> 0); the free option resolved and went to trash.
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Barrier")).toBe(true);
    // Q5458: the free (unpaid) use of a cost-2 Option still counts as "using" it, so the
    // [Your Turn] watcher fires and protects Sakuyamon from opponent-effect return.
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("locks itself against opponent return after a real paid cost-2 Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", under: ["BT17-035"], as: "sakuyamon" }],
          hand: [
            { card: "BT1-102", as: "option" },
            { card: "BT1-011", as: "spare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("sakuyamon"), "beReturned")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(observe(s.engine).isRestricted(s.perm("sakuyamon"), "beReturned")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not lock itself when the used Option costs less than 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", under: ["BT17-035"], as: "sakuyamon" }],
          hand: [
            { card: "ST3-13", as: "cheapOption" },
            { card: "BT1-011", as: "spare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheapOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "ST3-13"));

    expect(observe(s.engine).isRestricted(s.perm("sakuyamon"), "beReturned")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses a red Plug-In when a red board source meets its color requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-035", as: "base" },
            { card: "EX2-008", as: "redSource" },
          ],
          hand: [
            { card: "BT17-038", as: "sakuyamon" },
            { card: "EX2-066", as: "plugIn" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const plugInId = s.inst("plugIn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === plugInId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(plugInId);
  });

  it("does not use an unrelated or color-illegal Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-035", as: "base" }],
          hand: [
            { card: "BT17-038", as: "sakuyamon" },
            { card: "BT5-102", as: "unrelated" },
            { card: "EX2-066", as: "colorIllegalPlugIn" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const unrelatedId = s.inst("unrelated").instanceId;
    const illegalId = s.inst("colorIllegalPlugIn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.ready();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([unrelatedId, illegalId]),
    );
  });
});
