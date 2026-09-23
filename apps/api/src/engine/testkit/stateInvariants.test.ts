import { describe, expect, it } from "vitest";
import { CardInstance, GameState, Permanent, PlayerState, type Seat } from "@aegis/shared";
import { checkStateInvariants } from "./stateInvariants.js";

function card(id: string, ownerSeat: Seat): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = id;
  instance.cardId = "BT1-009";
  instance.ownerSeat = ownerSeat;
  return instance;
}

function permanent(id: string, controllerSeat: Seat, topCard: CardInstance): Permanent {
  const result = new Permanent();
  result.permanentId = id;
  result.controllerSeat = controllerSeat;
  result.topCard = topCard;
  return result;
}

function state(): GameState {
  const result = new GameState();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    result.players.push(player);
  }
  return result;
}

describe("checkStateInvariants", () => {
  it("accepts every supported card location and a controlled opponent-owned card", () => {
    const game = state();
    const player = game.players[0]!;
    player.deck.push(card("deck", 0));
    player.eggDeck.push(card("egg", 0));
    player.hand.push(card("hand", 0));
    player.security.push(card("security", 0));
    player.trash.push(card("trash", 0));
    player.delayZone.push(card("delay", 0));
    player.resolvingOption = card("resolving", 0);
    const board = permanent("board", 0, card("borrowed-top", 1));
    board.stack.push(card("stack", 0));
    board.linked.push(card("linked", 0));
    player.battleArea.push(board);
    player.breeding = permanent("breeding", 0, card("breeding-top", 0));
    game.memory = -10;

    expect(checkStateInvariants(game)).toEqual([]);
  });

  it("finds duplicate cards across loose and attached zones", () => {
    const game = state();
    const player = game.players[0]!;
    player.hand.push(card("same", 0));
    const board = permanent("board", 0, card("top", 0));
    board.linked.push(card("same", 0));
    board.stack.push(card("top", 0));
    player.battleArea.push(board);
    player.delayZone.push(card("delay", 0));
    player.resolvingOption = card("delay", 0);

    expect(checkStateInvariants(game)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("duplicate instanceId same"),
        expect.stringContaining("duplicate instanceId top"),
        expect.stringContaining("duplicate instanceId delay"),
      ]),
    );
  });

  it("finds duplicate permanents across battle and breeding", () => {
    const game = state();
    game.players[0]!.battleArea.push(permanent("same", 0, card("a", 0)));
    game.players[1]!.breeding = permanent("same", 1, card("b", 1));

    expect(checkStateInvariants(game)).toEqual([expect.stringContaining("duplicate permanentId same")]);
  });

  it("finds invalid memory and seat values", () => {
    const game = state();
    game.memory = 11;
    game.players[0]!.seat = 1;
    game.players[0]!.hand.push(card("bad-owner", 2 as Seat));
    game.players[0]!.battleArea.push(permanent("bad-controller", 2 as Seat, card("top", 0)));

    expect(checkStateInvariants(game)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("memory out of bounds"),
        expect.stringContaining("player seat mismatch"),
        expect.stringContaining("invalid ownerSeat"),
        expect.stringContaining("invalid controllerSeat"),
      ]),
    );
  });

  it("rejects an occupied loose zone entry without a card identity", () => {
    const game = state();
    game.players[0]!.deck.push(new CardInstance());

    expect(checkStateInvariants(game)).toEqual([expect.stringContaining("missing instanceId at players[0].deck[0]")]);
  });

  it("rejects malformed battle and breeding permanents", () => {
    const game = state();
    const board = permanent("", 0, new CardInstance());
    board.currentDP = -1;
    game.players[0]!.battleArea.push(board);
    game.players[1]!.breeding = permanent("breeding", 1, undefined as unknown as CardInstance);

    expect(checkStateInvariants(game)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("missing permanentId at players[0].battleArea[0]"),
        expect.stringContaining("negative currentDP -1 at players[0].battleArea[0]"),
        expect.stringContaining("missing instanceId at players[0].battleArea[0].topCard"),
        expect.stringContaining("missing instanceId at players[1].breeding.topCard"),
      ]),
    );
  });
});
