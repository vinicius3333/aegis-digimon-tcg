import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-012.js";

describe("BT17-012", () => {
  it("can digivolve onto a red Tamer as level 3 and has Raid", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Digivolve", asLevel: 3 }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
  });

  it("may digivolve while attacking into a Hybrid for 1 less", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }],
    });
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("applies inherited DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-013", as: "host", under: ["BT17-012"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(9000);
  });
});
