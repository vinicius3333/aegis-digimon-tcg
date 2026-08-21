import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-001.js";

describe("BT14-001", () => it("inherits once-per-turn draw when an opponent security card is removed during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" }, actions: [{ kind: "Draw", amount: 1 }] }] })));

it("draws once when the opponent's security is removed, but not from own security", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-007", as: "stack", under: ["BT14-001"] }], deck: ["BT1-001", "BT1-001"], security: ["BT1-001"] },
    1: { security: ["BT1-001"] },
  });
  s.state.turnSeat = 0;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("stack"));

  await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
  expect(s.state.players[0]!.hand).toHaveLength(0);

  await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
  expect(s.state.players[0]!.hand).toHaveLength(1);

  await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
  expect(s.state.players[0]!.hand).toHaveLength(1);
});
