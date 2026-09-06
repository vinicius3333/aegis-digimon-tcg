import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-024.js";
import "./index.js";

describe("BT20-024 Seadramon (X Antibody)", () => {
  it("returns a level 3 Digimon and conditionally restricts a Tamer on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
            to: "deckBottom",
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 },
            restriction: "suspend",
            duration: "untilOpponentTurnEnd",
            condition: {
              kind: "selfDigivolutionStackMatchesFilter",
              filter: {
                nameOrTrait: [
                  { tokens: ["Seadramon"], match: "nameExact" },
                  { tokens: ["X Antibody"], match: "nameExact" },
                ],
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", condition: { op: "lte", value: 7 } }],
    });
  });

  it("returns only the level-3 target to deck bottom and locks a Tamer when the source stack qualifies", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-024", as: "seadramonX", under: ["BT15-025"] }] },
        1: {
          battleArea: [
            { card: "BT20-022", as: "level3" },
            { card: "BT20-023", as: "level4" },
            { card: "BT20-087", as: "tamer" },
          ],
          deck: ["BT20-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level3").permanentId, s.perm("tamer").permanentId);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("seadramonX"));
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT20-022")).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT20-022");
    expect(s.perm("level4")).toBeDefined();

    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId], 0);
    expect(s.perm("tamer").isSuspended).toBe(false);
  });

  it.each([
    ["BT15-021", "BT15-021", false],
    ["BT9-109", "BT20-022", true],
    ["EX5-070", "BT20-022", true],
  ] as const)(
    "publicly digivolves with %s in the stack and applies the exact-name gate: %s",
    async (source, base, qualifies) => {
      const under = base === "BT20-022" ? [source] : [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base", ...(under.length > 0 ? { under } : {}) }],
            hand: [{ card: "BT20-024", as: "seadramonX" }],
          },
          1: {
            battleArea: [
              { card: "BT20-022", as: "level3" },
              { card: "BT20-087", as: "tamer" },
            ],
            deck: ["BT20-001"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("seadramonX").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT20-024");
      expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT20-022");
      expect(observe(s.engine).isRestricted(s.perm("tamer"), "suspend")).toBe(qualifies);
    },
  );

  it("does not lock a Tamer when neither qualifying exact name nor Rule Name is in the stack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-024", as: "seadramonX" }] },
        1: {
          battleArea: [
            { card: "BT20-022", as: "level3" },
            { card: "BT20-087", as: "tamer" },
          ],
          deck: ["BT20-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seadramonX").instanceId })).toEqual({
      ok: true,
    });
    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId], 0);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("inherits Draw 1 once at the inclusive seven-card hand boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-026", as: "host", under: ["BT20-024"] }],
        hand: Array.from({ length: 7 }, () => "BT20-001"),
        deck: ["BT20-003", "BT20-004"],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("reaches Seadramon (X Antibody) from a legal Seadramon stack through public evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-025", as: "seadramon" }], hand: [{ card: "BT20-024", as: "seadramonX" }] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("seadramon").permanentId,
        instanceId: s.inst("seadramonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("seadramon").topCard.cardId === "BT20-024");
    expect(s.perm("seadramon").topCard.cardId).toBe("BT20-024");
    expect(s.perm("seadramon").stack.map((card) => card.cardId)).toEqual(["BT15-025"]);
  });

  it("naturally returns only an opposing level-3 Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-024", as: "seadramonX" }] },
        1: {
          battleArea: [
            { card: "BT20-022", as: "level3" },
            { card: "BT20-023", as: "level4" },
          ],
          deck: ["BT20-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seadramonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-022"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-023")).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT20-022");
  });
});
