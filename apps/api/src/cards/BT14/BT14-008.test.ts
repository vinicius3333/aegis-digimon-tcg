import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-008.js";

describe("BT14-008", () => it("inherits once-per-turn deletion of an opposing 3000 DP or lower Digimon when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", value: 3000 } } } }] })));

it("deletes one opposing Digimon at 3000 DP or less when the host attacks", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT14-007", as: "attacker", under: ["BT14-008"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "low" }, { card: "BT1-020", as: "high" }] },
    },
    { autoSelectCards: true },
  );
  s.state.turnSeat = 0;
  s.state.memory = 10;
  const attacker = s.perm("attacker");
  const lowPermanentId = (s.state.players[1]!.battleArea[0]!).permanentId;
  const highPermanentId = (s.state.players[1]!.battleArea[1]!).permanentId;
  expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowPermanentId));
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowPermanentId)).toBe(false);
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highPermanentId)).toBe(true);
});
