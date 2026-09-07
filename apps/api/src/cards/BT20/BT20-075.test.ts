import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-075.js";
import "./index.js";

describe("BT20-075 Loudmon", () => {
  it("trashes two hand cards, then gives one bound Digimon +4000 DP, Raid, and Piercing on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Trash",
        target: { filter: { controller: "mine", zone: "hand" }, count: 2 },
      });
      expect(actions[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 4000,
        duration: "forTheTurn",
        target: { count: 1, bindAs: "loudmonTarget" },
      });
      expect(actions[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Raid" },
        duration: "forTheTurn",
        target: { fromSelectionRef: "loudmonTarget" },
      });
      expect(actions[3]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Piercing" },
        duration: "forTheTurn",
        target: { fromSelectionRef: "loudmonTarget" },
      });
    }
  });

  it("gives all own Dark Dragon or Evil Dragon Digimon Security Attack +1 with four or fewer hand cards", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            count: "all",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }],
            },
          },
          effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
          while: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 4 },
        },
      ],
    });
  });

  it("publishes stats and both trait arms of the level-4 alternate route", async () => {
    expect(getCardDefinition("BT20-075")).toMatchObject({ level: 5, playCost: 8, dp: 8000 });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Dark Dragon", "Evil Dragon"], cost: 3, isAlternate: true },
    ]);
    for (const base of ["BT20-069", "BT11-079"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT20-075", as: "loudmon" }],
          deck: ["BT20-047"],
        },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("loudmon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT20-075");
      expect(s.state.memory).toBe(0);
    }
  });

  it("on play and evolution trashes two cards, then gives one bound ally all three benefits", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-061", as: "ally" },
              ...(mode === "digivolve" ? [{ card: "BT20-069", as: "base" }] : []),
            ],
            hand: [
              { card: "BT20-075", as: "loudmon" },
              { card: "BT20-047", as: "first" },
              { card: "BT20-063", as: "second" },
            ],
            deck: ["BT20-047"],
          },
        },
        { autoSelectCards: true },
      );
      const initialDP = s.perm("ally").currentDP;
      s.state.memory = mode === "play" ? 8 : 3;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loudmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("loudmon").instanceId,
              useAlternateCost: true,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.perm("ally").currentDP === initialDP + 4000);
      expect(observe(s.engine).hasKeyword(s.perm("ally"), "Raid")).toBe(true);
      expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
      );
    }
  });

  it("the Then boost still resolves when fewer than two hand cards can be trashed", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT20-061", as: "ally" }], hand: [{ card: "BT20-075", as: "loudmon" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loudmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 5000);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
  });

  it("uses the public granted Raid and Piercing in a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-069", as: "ally" }],
          hand: [
            { card: "BT20-075", as: "loudmon" },
            { card: "BT20-047", as: "first" },
            { card: "BT20-063", as: "second" },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 4000, as: "target" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loudmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => observe(s.engine).hasKeyword(s.perm("ally"), "Raid") && observe(s.engine).hasPierce(s.perm("ally")),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("inherits Security Attack +1 for both trait arms only at the 4-card owner-turn boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-077", under: ["BT20-075"], as: "host" },
          { card: "BT20-069", as: "dark" },
          { card: "BT11-079", as: "evil" },
          { card: "BT20-047", as: "nonmatch" },
        ],
        hand: ["BT20-047", "BT20-047", "BT20-047", "BT20-047", "BT20-047"],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("dark"), "SecurityAttack")).toBe(0);
    s.state.players[0]!.hand.pop();
    await advance(s.engine).recompute();
    expect(observe(s.engine).keywordAmount(s.perm("dark"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("evil"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("nonmatch"), "SecurityAttack")).toBe(0);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).keywordAmount(s.perm("dark"), "SecurityAttack")).toBe(0);
  });
});
