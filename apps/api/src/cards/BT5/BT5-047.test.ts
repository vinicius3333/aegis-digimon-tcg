import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-047.js";

describe("BT5-047 Palmon", () => {
  it("places itself from trash under an own green Digimon when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-047", as: "palmon" }, { card: "BT5-046", as: "green" }] } }, { autoSelectCards: true });
    const palmonId = s.perm("palmon").topCard!.instanceId;
    await (s.engine as any).primitives.deletePermanent([s.perm("palmon").permanentId], "byEffect");
    await settle(() => s.perm("green").stack.some((card) => card.instanceId === palmonId));
    expect(s.perm("green").stack[0]?.instanceId).toBe(palmonId);
  });
});
