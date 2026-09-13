import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-049.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-049 Lalamon", () => {
  it("searches the green trait/Yoshino pair and installs the conditional reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottomAnyOrder",
          add: [
            {
              count: 1,
              to: "hand",
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  { match: "trait", tokens: ["Vegetation", "Plant"] },
                  { match: "trait", tokens: ["Fairy"] },
                ],
              },
            },
            { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Yoshino Fujieda"] }] } },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              mode: "reduceCost",
              amount: 1,
              condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Green"] } },
            },
          ],
        },
      ],
    });
  });

  it("adds one Vegetation Digimon and Yoshino while bottoming the nonmatch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-049", as: "lalamon" }],
          deck: [
            { card: "BT13-050", as: "vegetation" },
            { card: "BT13-100", as: "yoshino" },
            { card: "BT13-047", as: "nonmatch" },
            "BT1-009",
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lalamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("vegetation").instanceId, s.inst("yoshino").instanceId].sort(),
    );
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("nonmatch").instanceId);
  });

  it("does not treat a longer Yoshino name as the exact Yoshino Fujieda Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-049", as: "lalamon" }],
          deck: [
            { card: "BT13-050", as: "vegetation" },
            { card: "ST24-14", as: "long-yoshino" },
            { card: "BT13-047", as: "nonmatch" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lalamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("vegetation").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("long-yoshino").instanceId, s.inst("nonmatch").instanceId].sort(),
    );
  });

  it("reduces legal evolution costs by 1 and resets on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-051", as: "host", under: ["BT13-049"] },
          { card: "BT13-100", as: "yoshino" },
        ],
        hand: [
          { card: "BT13-053", as: "mihiramon" },
          { card: "BT1-080", as: "titamon" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { hand: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
    });
    s.state.memory = 10;
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("mihiramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT13-053");
    expect(s.state.memory).toBe(8);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT13-049")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const secondOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const beforeSecondEvolution = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-080");
    expect(s.state.memory).toBe(beforeSecondEvolution - 1);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT13-049")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondOwnTurn;
  });

  it("does not reduce without an own green Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-051", as: "host", under: ["BT13-049"] }],
        hand: [{ card: "BT13-053", as: "mihiramon" }],
      },
      1: { battleArea: [{ card: "BT13-100", as: "opponent-yoshino" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("mihiramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT13-053");
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT13-049")).toBe(true);
  });

  it("digivolves from a green level 2 for zero memory", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT13-004", as: "base" }, hand: [{ card: "BT13-049", as: "lalamon" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lalamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-049");
    expect(s.state.memory).toBe(1);
  });
});
