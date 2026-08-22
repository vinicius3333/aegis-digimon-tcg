import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-015.js";
import "./BT26-015.js";

describe("BT26-015 compiled fidelity", () => {
  it("encodes the shared play/evolution debuff, trash return deletion, and deck-add buff attack", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "ModifyDP", amount: -4000 },
      { kind: "Return", to: "deckBottom", trackCount: "returnedTrash" },
      { kind: "Delete", condition: { kind: "ifThisEffectActed" } },
    ]);
    expect(card?.effects?.[2]?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenEffectAddsToDeck",
        actions: [{ kind: "SelectBind" }, { kind: "ModifyDP", amount: 3000 }, { kind: "Attack" }],
      },
    ]);
  });

  it("publicly applies the play/evolution debuff, returns trash to deck, and deletes only after that return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "butenmon" }],
          trash: [{ card: "BT1-001", as: "returned" }],
          deck: [{ card: "BT1-002", as: "deckCard" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 4000 },
            { card: "BT1-010", as: "high", dp: 9000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("butenmon"));
    await settle(() => s.state.players[0]!.trash.length === 0);

    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-001");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("high").currentDP).toBe(5000);
  });

  it("unsuspends an inherited host when your effect adds to your deck, only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", suspended: true, under: [{ card: "BT26-015" }] }],
        trash: [
          { card: "BT1-001", as: "first" },
          { card: "BT1-002", as: "second" },
        ],
        deck: [{ card: "BT1-003", as: "firstDeck" }, { card: "BT1-004", as: "secondDeck" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("first").instanceId]);
    expect(s.perm("host").isSuspended).toBe(false);

    s.perm("host").isSuspended = true;
    await advance(s.engine).verb.returnToDeck([s.inst("second").instanceId]);
    expect(s.perm("host").isSuspended).toBe(true);
  });
});
