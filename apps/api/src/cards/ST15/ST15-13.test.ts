import { describe, it, expect } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

interface LedgerReader {
  hasKeyword(permanentId: string, keyword: string): boolean;
}

function ledgerOf(s: EngineSetup): LedgerReader {
  return (s.engine as unknown as { continuous: LedgerReader }).continuous;
}

const HIANDROMON = "ST15-13";
const LV5_BASE = "BT10-064";
const TARGET_LV3 = "BT1-009";

describe("ST15-13 <Blocker> static keyword", () => {
  it("grants ＜Blocker＞ on the battle area via the static modifier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: HIANDROMON, dp: 12000, as: "hia" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(ledgerOf(s).hasKeyword(s.perm("hia").permanentId, "Blocker")).toBe(true);
  });

  it("does NOT grant ＜Blocker＞ when ST15-13 is not on the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: LV5_BASE, dp: 6000, as: "other" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(ledgerOf(s).hasKeyword(s.perm("other").permanentId, "Blocker")).toBe(false);
  });

  it("can use Blocker at block timing and switches the attack target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
      1: { battleArea: [{ card: HIANDROMON, dp: 12000, as: "blocker" }] },
    });
    const attacker = s.perm("attacker");
    const blocker = s.perm("blocker");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(blocker.isSuspended).toBe(true);
  });
});

describe("ST15-13 [When Digivolving] delete opponent Digimon with play cost ≤ 8", () => {
  it("deletes the opponent's eligible Digimon after digivolving onto a Lv.5 base", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: LV5_BASE, dp: 6000, as: "base" }], hand: [{ card: HIANDROMON, as: "card" }] },
        1: { battleArea: [{ card: TARGET_LV3, dp: 3000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const base = s.perm("base");
    const target = s.perm("target");
    const targetPermanentId = target.permanentId;
    const targetTopId = target.topCard!.instanceId;
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("card").instanceId,
    });
    expect(result).toEqual({ ok: true });

    await settle(() => p1.trash.some((c) => c.instanceId === targetTopId));

    expect(p1.trash.some((c) => c.instanceId === targetTopId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === targetPermanentId)).toBe(false);
  });

  it("deletes a play-cost-8 Digimon but never the play-cost-10 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: LV5_BASE, dp: 6000, as: "base" }], hand: [{ card: HIANDROMON, as: "card" }] },
        1: {
          battleArea: [
            { card: "BT24-038", dp: 8000, as: "exactCost" },
            { card: "BT10-013", dp: 8000, as: "highCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const base = s.perm("base");
    const exactCost = s.perm("exactCost");
    const highCost = s.perm("highCost");
    const exactCostTopId = exactCost.topCard!.instanceId;
    const highCostPermanentId = highCost.permanentId;
    const highTopId = highCost.topCard!.instanceId;
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("card").instanceId,
    });
    expect(result).toEqual({ ok: true });

    await settle(() => p1.trash.some((c) => c.instanceId === exactCostTopId));

    expect(p1.battleArea.some((p) => p.permanentId === exactCost.permanentId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === exactCostTopId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === highCostPermanentId)).toBe(true);
    expect(p1.trash.some((c) => c.instanceId === highTopId)).toBe(false);
  });
});
