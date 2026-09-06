import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-054.js";
import "./index.js";

describe("BT20-054 Bulbmon", () => {
  it("has Blocker and may replace leaving the battle area during the opponent's turn", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "OpponentsTurn" && !effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          actions: [
            {
              kind: "PlayWithoutCost",
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
              target: { filter: { controller: "mine", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("may redirect one opposing attack to itself once per opponent turn as inherited text", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "RedirectAttack", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } }],
        },
      ],
    });
  });

  it("publishes Blocker on Bulbmon at runtime", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-054", as: "bulbmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("bulbmon"), "Blocker")).toBe(true);
  });

  it("publicly evolves from a black level-4 source and rejects a non-black level-4 source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT20-049", as: "blimpmon" }], hand: [{ card: "BT20-054", as: "bulbmon" }] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("blimpmon").permanentId,
        instanceId: legal.inst("bulbmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => legal.perm("blimpmon").topCard.cardId === "BT20-054" && legal.state.pendingDecision === undefined,
    );
    expect(legal.perm("blimpmon").stack.map((card) => card.cardId)).toEqual(["BT20-049"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT20-040", as: "greenRed" }], hand: [{ card: "BT20-054", as: "bulbmon" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("greenRed").permanentId,
        instanceId: invalid.inst("bulbmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.perm("greenRed").topCard.cardId).toBe("BT20-040");
  });

  it("may play only a cost-4-or-lower source when leaving on the opponent's turn", async () => {
    for (const [turnSeat, accept, shouldPlay] of [
      [1, true, true],
      [0, true, false],
      [1, false, false],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT20-054",
                under: [
                  { card: "BT20-051", as: "tooExpensive" },
                  { card: "BT20-047", as: "eligible" },
                ],
                as: "bulbmon",
              },
            ],
          },
        },
        { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
      );
      s.state.turnSeat = turnSeat;
      await s.ready();
      await advance(s.engine).verb.deletePermanent([s.perm("bulbmon").permanentId], "byEffect");
      await settle(() => s.state.players[0]!.battleArea.length === (shouldPlay ? 1 : 0));
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
        shouldPlay ? ["BT20-047"] : [],
      );
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT20-054", "BT20-051"]),
      );
    }
  });

  it("redirects an opposing attack only when Bulbmon is inherited", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-056", under: ["BT20-054"], dp: 10000, as: "host" },
            { card: "BT20-054", as: "standalone" },
          ],
          security: ["BT20-047"],
        },
        1: { battleArea: [{ card: "BT20-047", dp: 1000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-056")).toBe(true);
  });
});
