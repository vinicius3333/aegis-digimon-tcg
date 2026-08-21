import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-030";

describe("EX12-030 Thetismon", () => {
  it("uses the actual number of hand cards trashed to scale -2000 DP on play and digivolving", () => {
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -2000,
        optional: true,
        cost: {
          kind: "trash",
          target: { filter: { zone: "hand", controller: "mine" }, count: 3, upTo: true },
        },
        scaling: { per: 1, usePaidCount: true, unit: "cards" },
      });
      expect(effect.actions[1]).toMatchObject({ kind: "Return", to: "deckBottom", target: { count: 1 } });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "Unsuspend",
              optional: true,
              abortOnDecline: true,
              cost: { kind: "return", target: { count: 3, filter: { zone: "trash", controller: "mine" } } },
            },
          ],
        },
      ],
    });
  });

  it("trashes two hand cards, gives -4000 DP, and returns the 3000-DP result to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-001", as: "firstTrash" },
            { card: "BT1-002", as: "secondTrash" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("returns three Jellymon/DS cards to the deck to unsuspend its inherited host once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-011", as: "host", suspended: true, under: [{ card: cardId, as: "source" }] }],
          trash: ["EX12-027", "EX12-023", "EX12-028", "EX12-027", "EX12-023", "EX12-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      permanentId: s.perm("host").permanentId,
    });
    await settle(() => !s.perm("host").isSuspended);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(3);

    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      permanentId: s.perm("host").permanentId,
    });
    await settle();

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
