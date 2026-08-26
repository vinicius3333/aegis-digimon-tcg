import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-002 Puyoyomon", () => {
  it("returns its Aqua host to deck bottom and bounces only up to the returned level", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-033", as: "host", under: ["BT1-028", "BT19-002"] }] },
        1: {
          battleArea: [
            { card: "BT19-023", as: "attacker" },
            { card: "BT19-069", as: "level4" },
            { card: "BT19-024", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => (s.state.players[1] as PlayerState).hand.length > 0);

    expect((s.state.players[0] as PlayerState).deck.map((card) => card.cardId)).toEqual(["BT1-033"]);
    expect((s.state.players[0] as PlayerState).trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-028", "BT19-002"]),
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([]);
    expect((s.state.players[1] as PlayerState).hand.map((card) => card.cardId)).toEqual(["BT19-069"]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-024")).toBe(true);
  });

  it("may decline the return cost and leaves both boards unchanged", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-033", as: "host", under: ["BT1-028", "BT19-002"] }] },
        1: { battleArea: [{ card: "BT19-023", as: "attacker" }, { card: "BT19-069" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => false, 20);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("resolves MarineBullmon's Decode interruption before the level-5 bounce from Q3058", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-024", as: "host", under: ["BT19-019", "BT19-002"] }] },
        1: {
          battleArea: [
            { card: "BT19-028", as: "attacker" },
            { card: "BT19-023", as: "level5" },
            { card: "BT19-028", as: "level6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => (s.state.players[1] as PlayerState).hand.length > 0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-019"]);
    expect((s.state.players[0] as PlayerState).deck.map((card) => card.cardId)).toEqual(["BT19-024"]);
    expect((s.state.players[1] as PlayerState).hand.map((card) => card.cardId)).toEqual(["BT19-023"]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-028")).toBe(true);
  });
});
