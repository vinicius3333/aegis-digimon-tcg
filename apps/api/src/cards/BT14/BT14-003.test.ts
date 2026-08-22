import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-003.js";

describe("BT14-003", () => it("inherits once-per-turn draw when your security increases", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAddSecurity", fireCondition: { kind: "triggerSecurityIsYours" }, actions: [{ kind: "Draw", amount: 1 }] }] })));

it("draws once for your security addition, but ignores the opponent's addition", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-007", as: "stack", under: ["BT14-003"] }], deck: ["BT1-001", "BT1-001"], security: ["BT1-001"] },
    1: { security: ["BT1-001"] },
  });
  s.state.turnSeat = 0;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("stack"));

  await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 1 });
  expect(s.state.players[0]!.hand).toHaveLength(0);

  await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
  expect(s.state.players[0]!.hand).toHaveLength(1);

  await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
  expect(s.state.players[0]!.hand).toHaveLength(1);
});
