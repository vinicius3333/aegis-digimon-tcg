import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-036.js";

describe("BT14-036", () => {
  it("preserves Centarumon's catalog identity and both exact IR effects", () => {
    expect(getCardDefinition("BT14-036")).toMatchObject({
      nameEn: "Centarumon", colors: ["Yellow"], level: 4, playCost: 5, dp: 5000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"], attributes: ["Data"], types: ["Beastkin"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      amount: -3000,
      duration: "forTheTurn",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -2000, duration: "forTheTurn" }],
    });
  });

  it("reduces an opposing Digimon by 3000 DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-033", as: "base" }], hand: [{ card: "BT14-036", as: "centaru" }] },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("centaru").instanceId,
      }),
    ).toEqual({ ok: true });
    const target = () => s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId);
    await settle(() => target()?.currentDP === 1000);
    expect(target()?.currentDP).toBe(1000);
    expect(s.perm("base").topCard.cardId).toBe("BT14-036");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT14-033");
    expect(s.state.memory).toBe(-2);
    assertNoLoudGap(s);
  });

  it("inherits exactly one -2000 DP activation across two attacks in the same turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-037", as: "host", under: ["BT14-033", "BT14-036"] }] },
        1: {
          battleArea: [
            { card: "BT14-026", as: "target", dp: 8000 },
            { card: "BT14-028", as: "battleTarget", dp: 1000, suspended: true },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, {
      type: "attack", attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);
    await settle();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.engine.applyIntent(0, {
      type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("target").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });
});
