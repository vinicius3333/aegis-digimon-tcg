import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-073.js";

describe("BT1-073 Kabuterimon", () => {
  it("reaches a level 5 host through a legal level 3 to level 4 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [
          { card: "BT1-073", as: "kabuterimon" },
          { card: "BT1-075", as: "host" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
        ],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("kabuterimon").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("host").instanceId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-064", "BT1-073"]);
    expect(s.perm("base").currentDP).toBe(9000);
  });

  it("gives +1000 DP for each suspended opposing Digimon during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
          { card: "BT1-085", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("gives no DP when every opposing Digimon is unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: { battleArea: [{ card: "BT1-016" }, { card: "BT1-017" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("gives no DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: { battleArea: [{ card: "BT1-016", suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not apply while Kabuterimon is the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-073", as: "kabuterimon", dp: 5000 }] },
      1: { battleArea: [{ card: "BT1-016", suspended: true }] },
    });
    await s.ready();

    expect(s.perm("kabuterimon").currentDP).toBe(5000);
  });
});
