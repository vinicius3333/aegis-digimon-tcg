import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT19-087 (Nene Amano) — DigiXros source-zone expander:
//   "by suspending this Tamer, you may place DigiXros materials from your trash and from under your
//    Tamers" for a [Composite]/[Twilight] DigiXros play (documented behavior — trash max 1, under-Tamer max 1).
//
// FAILS-WHEN-REVERTED: a trash card is a legal DigiXros material ONLY while BT19-087's trash
// expansion is active. Without suspending it the trash zone is locked → the material is illegal.
// Also enforces the max-1 trash cap.

const NENE = "BT19-087";
const XROS_DIGIMON = "BT10-009"; // [Composite] L4 DigiXros card, recipe incl. [Shoutmon]/[Ballistamon]; cost 9
const SHOUTMON = "BT10-008";
const BALLISTAMON = "BT10-049";

describe("BT19-087 DigiXros source-zone expansion (trash)", () => {
  it("with BT19-087 suspended, a trash [Shoutmon] is a legal DigiXros material", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: NENE, dp: 0, as: "tamer" }],
        trash: [{ card: SHOUTMON, as: "trashMat" }],
        hand: [{ card: XROS_DIGIMON, as: "xros" }],
      },
    });
    const p0 = s.state.players[0];
    s.state.memory = 7;
    const tamerId = s.perm("tamer").permanentId;
    const trashMatId = s.inst("trashMat").instanceId;
    const xrosId = s.inst("xros").instanceId;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: xrosId,
      digiXros: { materialInstanceIds: [trashMatId], expanderPermanentIds: [tamerId] },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0?.battleArea.some((perm) => perm.topCard?.cardId === XROS_DIGIMON) ?? false);
    const perm = p0?.battleArea.find((p) => p.topCard?.cardId === XROS_DIGIMON);
    expect(perm?.stack.some((c) => c.instanceId === trashMatId)).toBe(true);
    expect(p0?.trash.some((c) => c.instanceId === trashMatId)).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("without suspending BT19-087, a trash material is illegal → DigiXros rejected", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: NENE, dp: 0 }],
        trash: [{ card: SHOUTMON, as: "trashMat" }],
        hand: [{ card: XROS_DIGIMON, as: "xros" }],
      },
    });
    s.state.memory = 9;
    const trashMatId = s.inst("trashMat").instanceId;
    const xrosId = s.inst("xros").instanceId;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: xrosId,
      digiXros: { materialInstanceIds: [trashMatId] },
    });
    expect(res.ok).toBe(false);
  });

  it("enforces the trash max of 1 (two trash materials → rejected)", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: NENE, dp: 0, as: "tamer" }],
        trash: [
          { card: SHOUTMON, as: "m1" },
          { card: BALLISTAMON, as: "m2" },
        ],
        hand: [{ card: XROS_DIGIMON, as: "xros" }],
      },
    });
    s.state.memory = 9;
    const tamerId = s.perm("tamer").permanentId;
    const m1Id = s.inst("m1").instanceId;
    const m2Id = s.inst("m2").instanceId;
    const xrosId = s.inst("xros").instanceId;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: xrosId,
      digiXros: { materialInstanceIds: [m1Id, m2Id], expanderPermanentIds: [tamerId] },
    });
    expect(res.ok).toBe(false);
  });
});
