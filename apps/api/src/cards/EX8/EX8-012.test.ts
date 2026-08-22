import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-012.js";

describe("EX8-012", () => {
  it("registers the draw/trash digivolving effect", () =>
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions.slice(0, 2)).toHaveLength(2));
  it("registers the once-per-turn inherited opponent-deletion memory effect", () =>
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" }));
  it("keeps the conditional Guilmon recovery branch attached to digivolution", () => {
    expect(compiled.effects[0]?.actions[2]).toMatchObject({ kind: "GainTriggeredEffect", gainedTrigger: "OnDeletion", duration: "untilOpponentTurnEnd" });
  });

  it("gains 1 memory when an opposing Digimon is deleted during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-012", as: "growlmon" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("opponent").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when one of its own Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-012", as: "growlmon" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.length > 0);
    expect(s.state.memory).toBe(0);
  });
});
