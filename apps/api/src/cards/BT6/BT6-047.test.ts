import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-047.js";

describe("BT6-047 Morphomon", () => {
  it("adds Menoa and Eosmon from the top 5 on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-047", as: "morphomon" }],
          deck: [{ card: "BT6-092", as: "menoa" }, { card: "BT6-085", as: "eosmon" }, "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("morphomon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("menoa").instanceId, s.inst("eosmon").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("adds whichever named card is available when only one match is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-047", as: "morphomon" }],
          deck: [{ card: "BT6-092", as: "menoa" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("morphomon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("menoa").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });
});

describe("BT6-047 Morphomon — KB Q&A rulings", () => {
  it("still adds a card when only one of [Menoa Bellucci] or an [Eosmon] Digimon is revealed (Q1433)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-047", as: "morphomon" }],
          deck: [
            "BT1-010",
            { card: "BT6-085", as: "eosmon" },
            "BT1-011",
            "BT1-012",
            "BT1-013",
            { card: "BT6-092", as: "unrevealedMenoa" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("morphomon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 1);
    await drainMicrotasks();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("eosmon").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(5);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("unrevealedMenoa").instanceId);

    const menoaOnly = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-047", as: "morphomon" }],
          deck: [
            "BT1-010",
            "BT1-011",
            { card: "BT6-092", as: "menoa" },
            "BT1-012",
            "BT1-013",
            { card: "BT6-085", as: "unrevealedEosmon" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(menoaOnly.engine).verb.deletePermanent([menoaOnly.perm("morphomon").permanentId], "byEffect");
    await settle(() => menoaOnly.state.players[0]!.hand.length === 1);
    await drainMicrotasks();

    expect(menoaOnly.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      menoaOnly.inst("menoa").instanceId,
    ]);
    expect(menoaOnly.state.players[0]!.deck[0]!.instanceId).toBe(menoaOnly.inst("unrevealedEosmon").instanceId);
  });
});
