import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-006.js";
import "../index.js";

describe("BT16-006", () => {
  it("gains 1 memory on deletion by trashing a hand card", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "trash" }, optional: false }],
    }));

  it("trashes exactly one hand card and gains memory when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-006"] }],
          hand: [{ card: "BT1-009", as: "costCard" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costCard").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.filter((card) => card.instanceId === s.inst("costCard").instanceId)).toHaveLength(
      1,
    );
  });

  it("does not gain memory when the deletion cost cannot be paid", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-006"] }] } });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.memory).toBe(0);
  });
});
