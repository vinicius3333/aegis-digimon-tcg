import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT17-001–010 targeted audit regressions", () => {
  it("BT17-002 draws only when a Digimon is played from a stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-030", under: [{ card: "BT1-010", as: "stackPlay" }, "BT17-002"], as: "host" }], deck: ["BT1-011"] },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("stackPlay").instanceId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.hand.length).toBe(1);
  });

  it("BT17-006 reacts to the same Tamer placement and digivolves only the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", under: ["BT17-006"], as: "host" }],
        hand: [{ card: "BT1-085", as: "tamer" }],
        trash: ["BT15-011"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => s.perm("host").topCard?.cardId === "BT15-011");
    expect(s.perm("host").topCard?.cardId).toBe("BT15-011");
  });

  it("BT17-003 gains memory for a Tamer placement, not a Digimon placement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", under: ["BT17-003"], as: "host" }],
        hand: [{ card: "BT1-085", as: "tamer" }, { card: "BT1-010", as: "digimon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("digimon").instanceId]);
    expect(s.state.memory).toBe(0);
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);
    expect(s.state.memory).toBe(1);
  });

  it("BT17-008 checks the entered subject instead of unrelated existing cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-008", as: "guilmon" }, { card: "BT1-009", as: "calumonLike" }],
        hand: [{ card: "BT1-010", as: "unrelated" }],
      },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("unrelated").instanceId]);
    expect(s.state.memory).toBe(0);
  });
});
