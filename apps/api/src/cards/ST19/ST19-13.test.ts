import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-13.js";

describe("ST19-13 ShinMonzaemon", () => {
  it("matches Armor Purge and recovery-from-trash wording", () => {
    const card = getCardDefinition("ST19-13")!;
    expect(card.effectText).toContain("＜Armor Purge＞");
    expect(card.effectText).toContain("＜Recovery +1 (Deck)＞");
  });

  it("plays a level 5-or-lower Puppet from trash under itself when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-13", as: "shin" }],
          trash: [
            { card: "ST19-02", as: "eligible" },
            { card: "BT1-010", as: "ineligible" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard.cardId === "ST19-13" &&
          permanent.stack.some((card) => card.instanceId === s.inst("eligible").instanceId),
      ),
    );

    const shin = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST19-13");
    expect(shin?.stack.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(shin?.stack[0]?.instanceId).toBe(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ineligible").instanceId);
    expect(s.state.players[0]!.security[0]?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.security[0]?.faceUp).toBe(false);
  });

  it("does not recover when the mandatory placement has no eligible trash card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-13", as: "shin" }],
          trash: [{ card: "BT1-010", as: "ineligible" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shin").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });
});
