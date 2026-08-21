import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-024.js";

describe("BT14-024", () => it("inherits once-per-turn trashing of two bottom opposing digivolution cards when attacked", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: false }] }] })));

it("trashes the attacking Digimon's bottom two sources", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT1-015", as: "holder", under: ["BT14-024"] }] },
    1: { battleArea: [{ card: "BT1-015", as: "attacker", under: ["BT1-001", "BT1-002", "BT1-003"] }] },
  }, { autoSelectCards: true });
  s.state.turnSeat = 1;
  s.state.memory = 10;
  expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.length >= 2);
  expect(s.state.players[1]!.trash.filter((card) => ["BT1-001", "BT1-002"].includes(card.cardId))).toHaveLength(2);
});
