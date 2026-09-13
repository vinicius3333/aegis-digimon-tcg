import { CardInstance, GameState, Permanent, Phase, PlayerState } from "@aegis/shared";
import { expect, it } from "vitest";
import { canAttackWith } from "../game/boardModel";
import { prepareDemoCombat } from "./arenaDemoCombat";

function permanent(id: string, cardId = "ST1-03") {
  const result = new Permanent();
  result.permanentId = id;
  result.topCard = new CardInstance();
  result.topCard.cardId = cardId;
  return result;
}
function fixture() {
  const state = new GameState();
  state.turnCount = 5;
  state.turnSeat = 0;
  state.phase = Phase.Main;
  const own = new PlayerState();
  own.seat = 0;
  const attacker = permanent("own");
  attacker.isSuspended = true;
  attacker.summoningSick = true;
  attacker.cannotAttack = true;
  attacker.enterFieldTurnCount = state.turnCount;
  own.battleArea.push(attacker, permanent("own-tamer", "BT26-092"));
  own.breeding = permanent("raising");
  own.breeding.inBreeding = true;
  const opponent = new PlayerState();
  opponent.seat = 1;
  const target = permanent("suspended");
  target.isSuspended = true;
  const tamer = permanent("tamer", "BT24-088");
  tamer.isSuspended = true;
  opponent.battleArea.push(target, permanent("standing"), tamer);
  state.players.push(own, opponent);
  return { state, own, attacker, opponent };
}

it("prepares own field Digimon and projects suspended opposing Digimon/security as attack targets", () => {
  const { state, own, attacker, opponent } = fixture();
  prepareDemoCombat(state);
  expect(attacker.isSuspended).toBe(false);
  expect(attacker.summoningSick).toBe(false);
  expect(attacker.cannotAttack).toBe(false);
  expect(attacker.enterFieldTurnCount).toBe(4);
  expect(canAttackWith(attacker)).toBe(true);
  expect(attacker.canAttackPlayer).toBe(true);
  expect([...attacker.attackablePermanentIds]).toEqual(["suspended"]);
  expect(canAttackWith(own.battleArea[1]!)).toBe(false);
  expect(canAttackWith(own.breeding!)).toBe(false);
  expect(opponent.battleArea[0]!.isSuspended).toBe(true);
  expect(canAttackWith(opponent.battleArea[0]!)).toBe(false);
});

it("clears attack affordances outside your Main phase without retaining stale targets", () => {
  const { state, attacker } = fixture();
  prepareDemoCombat(state);
  state.phase = Phase.Draw;
  prepareDemoCombat(state);
  expect(canAttackWith(attacker)).toBe(false);
  expect([...attacker.attackablePermanentIds]).toEqual([]);
  state.phase = Phase.Main;
  state.turnSeat = 1;
  prepareDemoCombat(state);
  expect(canAttackWith(attacker)).toBe(false);
});
