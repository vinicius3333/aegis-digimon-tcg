import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-019.js";

describe("BT14-019", () => it("inherits once-per-turn trashing of two bottom digivolution cards when an opponent attacks", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: false }] }] })));

it("trashes the attacking Digimon's two bottom sources", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-007", as: "host", under: ["BT14-019"] }], security: ["BT1-001"] },
    1: { battleArea: [{ card: "BT1-015", as: "attacker", under: ["BT1-001", "BT1-001"] }] },
  });
  s.state.turnSeat = 1;
  s.state.memory = 10;
  const attacker = s.perm("attacker");
  expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  await settle(() => attacker.stack.length === 0);
  expect(attacker.stack).toHaveLength(0);
});
