import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-006.js";

describe("BT18-006 Frimon", () => {
  it("trashes one deck card per distinct opponent Digimon/Tamer color on deletion", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "Trash", scaling: { per: 1, unit: "colors" } }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-006"] }], deck: [{ card: "BT1-001" }, { card: "BT1-002" }, { card: "BT1-003" }, { card: "BT1-004" }] }, 1: { battleArea: [{ card: "BT1-030" }, { card: "BT1-009" }, { card: "BT1-087" }] } });
    await s.ready();
    await s.engine.primitives.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.players[0]!.deck.length).toBe(1);
  });
});
