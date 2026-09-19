import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine } from "./testkit/harness.js";
import "../cards/index.js";

const cards = ["BT20-052", "BT20-055", "EX11-041", "EX11-043", "BT26-082"];

describe.each(cards)("%s resident security timing", (cardId) => {
  it.each(["hand", "trash", "battle", "stack", "faceDown", "faceUp"] as const)(
    "only triggers and plays from face-up security at opponent turn end: %s",
    async (zone) => {
      const card = { card: cardId, as: "source", faceUp: zone !== "faceDown" };
      const s = setupEngine(
        {
          0: {
            hand: zone === "hand" ? [card] : [],
            trash: zone === "trash" ? [card] : [],
            battleArea: zone === "battle" ? [card] : zone === "stack" ? [{ card: "BT1-009", under: [card] }] : [],
            security: zone === "faceUp" || zone === "faceDown" ? [card] : [],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await advance(s.engine).runTurn(1);
      const triggered = s.events.filter(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === cardId && event.timing === "OnEndTurn",
      );
      expect(triggered).toHaveLength(zone === "faceUp" ? 1 : 0);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("source").instanceId)).toBe(
        zone === "faceUp" || zone === "battle",
      );
    },
  );

  it("does not play from security at its owner's turn end", async () => {
    const s = setupEngine({ 0: { security: [{ card: cardId, faceUp: true }] } });
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
