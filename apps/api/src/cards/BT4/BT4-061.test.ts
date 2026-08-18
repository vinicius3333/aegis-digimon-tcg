import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-061.js";

describe("BT4-061 BanchoLeomon", () => {
  it("suspends up to 2 opposing Digimon when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-061", dp: 1000, as: "bancho" }] }, 1: { battleArea: [{ card: "BT1-009", as: "a" }, { card: "BT1-010", as: "b" }] } }, { autoSelectCards: true });
    await (s.engine as any).primitives.deletePermanent([s.perm("bancho").permanentId], "byEffect");
    await settle(() => s.perm("a").isSuspended && s.perm("b").isSuspended);

    expect(s.perm("a").isSuspended).toBe(true);
    expect(s.perm("b").isSuspended).toBe(true);
  });
});
