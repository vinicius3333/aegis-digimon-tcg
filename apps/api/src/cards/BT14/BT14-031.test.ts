import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-031.js";

describe("BT14-031", () => it("inherits once-per-turn -2000 DP to an opposing Digimon when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }] })));

it("reduces an opposing Digimon's DP when the host attacks", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT14-031"] }] },
    1: { battleArea: [{ card: "BT1-015", as: "target" }] },
  }, { autoSelectCards: true });
  s.state.turnSeat = 0;
  s.state.memory = 10;
  const targetId = s.perm("target").permanentId;
  expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  const target = () => s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId);
  await settle(() => target()?.currentDP === 2000);
  expect(target()?.currentDP).toBe(2000);
});
