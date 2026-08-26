import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-049.js";
import { EffectTiming } from "@aegis/shared";
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
          rest: "deckBottom",
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
            { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "name", tokens: ["Yoshino Fujieda"] }] } },
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
          battleArea: [{ card: "BT13-049", as: "lalamon" }],
          deck: [
            { card: "BT13-050", as: "vegetation" },
            { card: "BT13-100", as: "yoshino" },
            { card: "BT13-047", as: "nonmatch" },
            "BT1-001",
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("lalamon"));
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("vegetation").instanceId, s.inst("yoshino").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("nonmatch").instanceId);
  });

  it("reduces its host's digivolution cost by 1 with an own green Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-047", as: "host", under: ["BT13-049"] },
          { card: "BT13-100", as: "yoshino" },
        ],
        hand: [{ card: "BT13-050", as: "sunflow" }],
      },
    });
    await s.ready();
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("sunflow").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT13-050");
    expect(s.state.memory).toBe(2);
  });

  it("does not reduce without an own green Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-047", as: "host", under: ["BT13-049"] }], hand: [{ card: "BT13-050", as: "sunflow" }] },
      1: { battleArea: [{ card: "BT13-100", as: "opponent-yoshino" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("sunflow").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT13-050");
    expect(s.state.memory).toBe(1);
  });

  it("digivolves from a green level 2 for zero memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-004", as: "base" }], hand: [{ card: "BT13-049", as: "lalamon" }] },
    });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("lalamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-049");
    expect(s.state.memory).toBe(1);
  });
});
