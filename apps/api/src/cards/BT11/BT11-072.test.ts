import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-072.js";
describe("BT11-072 Machinedramon", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-072")).toMatchObject({
      cardId: "BT11-072",
      colors: ["Black"],
      level: 6,
      playCost: 11,
      dp: 11000,
      types: ["Machine"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenDigivolving", actions: [{ kind: "RevealAdd", revealCount: 5 }] },
      { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 5 }] },
      { trigger: "OnDeletion", actions: [{ kind: "Return", to: "deckBottom" }, { kind: "PlayWithoutCost" }] },
    ]);
  });

  it("reveals five and trashes unmatched cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-072", as: "machine" }], deck: ["BT1-001", "BT1-002"] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("machine"));
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("independently adds a Machine card when no Analogman is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-072", as: "machine" }],
          deck: ["BT11-067", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 4);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT11-067");
    expect(s.state.players[0]!.trash).toHaveLength(4);
  });

  it("can place the revealed Cyborg or Machine card under itself instead of adding it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-072", as: "machine" }],
          deck: ["BT11-067", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("machine"));

    expect(s.perm("machine").stack.map(({ cardId }) => cardId)).toContain("BT11-067");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(4);
  });

  it("bottom-decks Analogman to play Machinedramon from hand for free on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-072", as: "deleted" },
            { card: "BT11-092", as: "analogman" },
          ],
          hand: [{ card: "BT11-072", as: "replacement" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("replacement").instanceId),
    );

    // The returned Analogman is immediately revealed by the replacement
    // Machinedramon's [On Play] effect and added back to hand.
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-092")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("replacement").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("may still bottom-deck Analogman when no Machinedramon is in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-072", as: "deleted" },
            { card: "BT11-092", as: "analogman" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId]);
    await settle(() => s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT11-092"));

    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT11-092");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not play Machinedramon when no Analogman was placed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-072", as: "deleted" }],
          hand: [{ card: "BT11-072", as: "replacement" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("replacement").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
