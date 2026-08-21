import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

const MEPHISTOMON = "BT17-068";
const GULFMON = "BT17-070"; // Gulfmon Lv6 — eligible for [On Deletion]

describe("BT17-068 Mephistomon — [On Deletion] play Gulfmon from hand", () => {
  it("[On Deletion] plays Gulfmon from hand to battle area when Mephistomon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MEPHISTOMON, dp: 7000, as: "meph" }],
          hand: [{ card: GULFMON, as: "gulfmon" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const mephPermId = s.perm("meph").permanentId;
    const gulfId = s.inst("gulfmon").instanceId;
    await advance(s.engine).verb.deletePermanent([mephPermId], "byEffect");
    await settle(() => !p0?.battleArea.some((p) => p.permanentId === mephPermId), 1000);

    // Verify Mephistomon was actually deleted (not still alive).
    expect(p0?.battleArea.some((p) => p.permanentId === mephPermId)).toBe(false);

    // Wait for [On Deletion] to resolve (Gulfmon played to battle area).
    await settle(() => p0?.battleArea.some((p) => p.topCard?.cardId === GULFMON) ?? false, 400);

    // Mephistomon was deleted in battle; [On Deletion] fired and played Gulfmon.
    const gulfInBattle = p0?.battleArea.some((p) => p.topCard?.instanceId === gulfId);
    expect(gulfInBattle).toBe(true);
  });

  it("keeps the revealed-from-deck level override explicitly machine-readable as unresolved", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter.js");
    const compiled = runtimeCompiledCard(MEPHISTOMON)!;
    expect(compiled.residual).toEqual(["missing-primitive(unaudited): this card is also treated as level 6"]);
  });
});
