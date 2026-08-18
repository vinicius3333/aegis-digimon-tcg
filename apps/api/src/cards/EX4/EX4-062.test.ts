import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX4-062 (Nene Amano & Kiriha Aonuma) — DigiXros source-zone expander:
//   "by suspending this Tamer, you may place DigiXros materials from your trash and from under your
//    Tamers" for a [Blue Flare]/[Twilight] DigiXros play (documented behavior — trash max 1, under-Tamer max 1).
//
// FAILS-WHEN-REVERTED: a trash card is a legal DigiXros material ONLY while EX4-062's expansion is
// active AND the played card carries [Blue Flare]/[Twilight]. Without suspending it the trash zone
// is locked → the material is illegal and the DigiXros play is rejected.

const EX4_062 = "EX4-062";
const BLUE_FLARE_DIGIMON = "BT11-030"; // [Blue Flare] L5 DigiXros card, recipe incl. [MetalGreymon]; cost 8
const METALGREYMON = "BT10-024"; // "MetalGreymon" Blue L5

describe("EX4-062 DigiXros source-zone expansion (trash, [Blue Flare] gate)", () => {
  it("with EX4-062 suspended, a trash [MetalGreymon] is a legal DigiXros material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: EX4_062, dp: 0, as: "tamer" }],
          trash: [{ card: METALGREYMON, as: "trashMat" }],
          hand: [{ card: BLUE_FLARE_DIGIMON, as: "xros" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    const tamer = s.perm("tamer");
    const trashMat = s.inst("trashMat");
    const xros = s.inst("xros");
    s.state.memory = 6; // cost 8 - 1×2 = 6

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: xros.instanceId,
      digiXros: { materialInstanceIds: [trashMat.instanceId], expanderPermanentIds: [tamer.permanentId] },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === BLUE_FLARE_DIGIMON));
    const perm = p0.battleArea.find((p) => p.topCard?.cardId === BLUE_FLARE_DIGIMON);
    expect(perm!.stack.some((c) => c.instanceId === trashMat.instanceId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === trashMat.instanceId)).toBe(false);
    expect(tamer.isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("without suspending EX4-062, a trash material is illegal → DigiXros rejected", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: EX4_062, dp: 0, as: "tamer" }],
        trash: [{ card: METALGREYMON, as: "trashMat" }],
        hand: [{ card: BLUE_FLARE_DIGIMON, as: "xros" }],
      },
    });
    const trashMat = s.inst("trashMat");
    const xros = s.inst("xros");
    s.state.memory = 8;
    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: xros.instanceId,
      digiXros: { materialInstanceIds: [trashMat.instanceId] },
    });
    expect(res.ok).toBe(false);
  });
});
