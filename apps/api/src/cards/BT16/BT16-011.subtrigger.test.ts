import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";

describe("BT16-011 whenCardReturnsFromTrashToHand -> gain <Rush> for the turn", () => {
  it("returning a red Digimon from trash to hand grants Rush to BT16-011", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-011", dp: 9000, as: "bt16011" }],
        trash: [{ card: "BT16-011", as: "trashedRed" }],
      },
    });

    const trashedInstanceId = s.inst("trashedRed").instanceId;
    await advance(s.engine).verb.returnToHand([trashedInstanceId]);
    await settle(() => true, 20);

    const perm = s.perm("bt16011");
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, kw: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(perm.permanentId, "Rush")).toBe(true);
  });

  it("does NOT grant Rush when the returned card is NOT a red Digimon (color-filter control)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-011", dp: 9000, as: "bt16011" }],
        trash: [{ card: "BT1-028", as: "trashedNonRed" }],
      },
    });

    const trashedInstanceId = s.inst("trashedNonRed").instanceId;
    await advance(s.engine).verb.returnToHand([trashedInstanceId]);
    await settle(() => true, 20);

    const perm = s.perm("bt16011");
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, kw: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(perm.permanentId, "Rush")).toBe(false);
  });

  it("grants Rush when the returned red card is a Tamer, not only a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-011", dp: 9000, as: "bt16011" }],
        trash: [{ card: "BT15-082", as: "trashedRedTamer" }],
      },
    });

    await advance(s.engine).verb.returnToHand([s.inst("trashedRedTamer").instanceId]);
    await settle(() => true, 20);

    const perm = s.perm("bt16011");
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, kw: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(perm.permanentId, "Rush")).toBe(true);
  });
});
