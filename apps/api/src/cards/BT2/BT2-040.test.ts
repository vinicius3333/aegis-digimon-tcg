import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-040.js";

describe("BT2-040 Ophanimon", () => {
  it("places itself face down in security on deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-040", as: "ophanimon" }], security: ["BT1-010"] } });
    const id = s.perm("ophanimon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("ophanimon").permanentId]);

    const recovered = s.state.players[0]!.security.find((card) => card.instanceId === id);
    expect(recovered).toBeDefined();
    expect(recovered!.faceUp).toBe(false);
  });

  it("returns only Ophanimon while its Maycrackmon source stays in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-040", as: "ophanimon", under: [{ card: "BT4-045", as: "maycrackmon" }] }] },
    });
    const ophanimonId = s.perm("ophanimon").topCard.instanceId;
    const maycrackmonId = s.inst("maycrackmon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("ophanimon").permanentId]);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([ophanimonId]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === maycrackmonId)).toBe(true);
  });
});
