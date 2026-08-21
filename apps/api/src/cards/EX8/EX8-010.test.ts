import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-010.js";

describe("EX8-010", () => {
  it("deletes an opposing Digimon with 4000 DP or less on play and deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { dp: { op: "lte", value: 4000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { dp: { op: "lte", value: 4000 } } },
    });
  });
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
  it("deletes a 4000-DP opposing Digimon on live On Play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-010", as: "meramon" }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("applies its inherited +2000 DP during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-010", as: "meramon" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
