import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-047.js";
import "../index.js";

describe("BT16-047", () => {
  it("suspends and prevents unsuspending an opposing Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }],
    });
  });

  it("trashes security or gains memory after a battle deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          actions: [
            { kind: "SecurityManipulation", op: "trashTop", condition: { kind: "securityAtLeast", value: 3 } },
            { kind: "GainMemory", amount: 2, condition: { kind: "securityAtMost", value: 3 } },
          ],
        },
      ],
    });
  });

  it("activates both security branches at exactly three security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-047", as: "achilles" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 5;

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("achilles").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(7);
  });
});
