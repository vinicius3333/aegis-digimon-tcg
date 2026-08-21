import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-018.js";

describe("EX8-018", () => {
  it("reveals 3 for a DS card and a Sea Beast/Plesiosaur card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("inherits a once-per-turn draw when attacking with seven or fewer cards in hand", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }],
    }));
  it("selects the printed DS and Sea Beast/Plesiosaur matches from the live reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-018", as: "gomamon" }],
          deck: [
            { card: "EX8-020", as: "ds" },
            { card: "EX8-027", as: "plesiosaur" },
            { card: "AD1-001", as: "decoy" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "EX8-020") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX8-027"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX8-020", "EX8-027"]));
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("AD1-001");
  });
  it("draws once when the host attacks with seven or fewer cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-018", as: "gomamon" }] }],
        deck: ["AD1-001"],
      },
    });
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
  });
});
