import { describe, expect, it } from "vitest";
import { Zone, type GameState } from "@aegis/shared";
import { installVisibilityPort } from "../state/access.js";
import { advance } from "../testkit/advance.js";
import { setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

/** Record each card's face state at the moment the visibility port learns it entered trash. */
function watchTrashArrivals(state: GameState): Map<string, boolean> {
  const faceUpOnArrival = new Map<string, boolean>();
  for (const player of state.players) {
    installVisibilityPort(player, (_owner, zone, card) => {
      if (zone === Zone.Trash) faceUpOnArrival.set(card.instanceId, card.faceUp);
    });
  }
  return faceUpOnArrival;
}

describe("trash is public: every card enters it face up", () => {
  it("Discord 1555363063300096090: a face-down hand card trashed as a cost reaches the opponent face up", async () => {
    const s = setupEngine({ 0: {}, 1: { hand: [{ card: "BT1-083", as: "drawn" }] } });
    const drawn = s.inst("drawn");
    // The draw-phase draw leaves the deck's face-down flag on the card in hand.
    drawn.faceUp = false;
    const arrivals = watchTrashArrivals(s.state);

    await advance(s.engine).verb.trash([drawn.instanceId]);

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(drawn.instanceId);
    expect(arrivals.get(drawn.instanceId)).toBe(true);
  });

  it("an Option in the battle area and its stack enter trash face up", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-090", as: "option", under: ["BT1-091"] }] }, 1: {} });
    const option = s.perm("option");
    const optionTop = option.topCard;
    const stackCard = option.stack[0]!;
    const arrivals = watchTrashArrivals(s.state);

    await advance(s.engine).verb.trash([optionTop.instanceId]);

    expect(arrivals.get(optionTop.instanceId)).toBe(true);
    expect(arrivals.get(stackCard.instanceId)).toBe(true);
  });

  it("digivolution cards are face up when the opponent's view learns they entered trash", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-012", as: "host", under: ["BT1-009"] }] }, 1: {} });
    const host = s.perm("host");
    const source = host.stack[0]!;
    source.faceUp = false;
    const arrivals = watchTrashArrivals(s.state);

    await advance(s.engine).verb.trashDigivolutionCards(host.permanentId, [source.instanceId]);

    expect(arrivals.get(source.instanceId)).toBe(true);
  });
});
