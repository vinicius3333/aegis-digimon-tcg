import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-020.js";
import "../index.js";

describe("BT24-020 Gomamon", () => {
  it("reveals three cards for the two printed hand additions", () => {
    const reveal = compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add[0].filter.nameOrTrait).toEqual([
      { tokens: ["Sea Beast", "Shaman"], match: "trait" },
      { tokens: ["Aqua", "Sea Animal"], match: "trait" },
    ]);
    expect(reveal.add[1].filter.nameOrTrait).toEqual([{ tokens: ["TS"], match: "trait" }]);
  });

  it("draws on this Digimon's unsuspend when hand size is at most seven", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenUnsuspended",
      sourceFilter: { isSelfRef: true },
    });
    expect(inherited.actions[0].actions[0].condition).toMatchObject({
      kind: "zoneCount",
      seat: "mine",
      zone: "hand",
      op: "lte",
      value: 7,
    });
  });

  it("adds one Sea Beast Digimon and one TS card from the top three, bottom-decking the miss", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-020", as: "gomamon" }],
          deck: [
            { card: "BT24-022", as: "seaBeast" },
            { card: "BT24-083", as: "tsTamer" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gomamon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("seaBeast").instanceId, s.inst("tsTamer").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("draws at seven cards only for its own host's unsuspend, once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-022", as: "host", under: ["BT24-020"] },
          { card: "BT24-022", as: "other" },
        ],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("other").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(7);
    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("host").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw when eight cards are already in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-022", as: "host", under: ["BT24-020"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("digivolves from a non-blue level 2 TS Digi-Egg for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-003", as: "tsEgg" },
        hand: [{ card: "BT24-020", as: "gomamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsEgg").permanentId,
        instanceId: s.inst("gomamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsEgg").topCard.instanceId === s.inst("gomamon").instanceId);

    expect(s.state.memory).toBe(5);
  });
});
