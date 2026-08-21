import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-02.js";

describe("ST19-02 ＜Barrier＞ is once per turn", () => {
  it("uses the catalogued Junkmon Puppet identity", () => {
    expect(getCardDefinition("ST19-02")).toMatchObject({
      nameEn: "Junkmon",
      types: ["Puppet"],
      effectText: expect.stringContaining("Decoy ([Puppet] trait)"),
      inheritedEffectText: "＜Barrier＞.",
    });
  });

  it("prevents the first battle deletion but not the second in the same turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "first", dp: 5000 }, { card: "AD1-001", as: "second", dp: 5000 }] },
      1: { battleArea: [{ card: "ST19-10", as: "barrier", dp: 1000, suspended: true, under: ["ST19-02"] }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("first").permanentId,
      target: { kind: "permanent", permanentId: s.perm("barrier").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.perm("first").suspended && s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("barrier").permanentId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("second").permanentId,
      target: { kind: "permanent", permanentId: s.perm("barrier").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
