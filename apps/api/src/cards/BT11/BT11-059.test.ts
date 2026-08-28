import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
// Self-register every card module so the engine drives the REGISTERED BT11-059
// hand-override (not a hand-built ledger — Pitfall 3).
import "../index.js";
import { compiled } from "./BT11-059.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { definitionMatches } from "../../engine/effects/interpreter/matching/definition.js";

/**
 * Drive the REAL digivolve into BT11-059 over `tamerCardIds` green/black Tamers and return
 * the memory paid (the shared gauge delta). BT11-059's printed EvoCost is Green/Lv.5/cost 5.
 */
async function paidToEvolveIntoBT11059(tamerCardIds: string[]) {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT1-075", dp: 5000, as: "base" }, // Lv.5 Green base
        ...tamerCardIds.map((id) => ({ card: id, dp: 0 })),
      ],
      hand: [{ card: "BT11-059", faceUp: false, as: "evolving" }], // the digivolution target
    },
  });
  const p0 = s.state.players[0] as PlayerState;
  s.state.memory = 10;

  await s.engine.recomputeContinuousEffects();
  const before = s.state.memory;
  s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("base").permanentId,
    instanceId: s.inst("evolving").instanceId,
  });
  await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT11-059"));
  const evolved = p0.battleArea.some((p) => p.topCard?.cardId === "BT11-059");
  return { paid: before - s.state.memory, evolved };
}

describe("A3 BT11-059 — digivolve cost reduced per green/black Tamer (Q2092 dual=1)", () => {
  it("maps catalog facts and both executable clauses", () => {
    expect(getCardDefinition("BT11-059")).toMatchObject({ cardId: "BT11-059", colors: ["Green", "Black"], level: 6, playCost: 13, dp: 13000 });
    expect(compiled.effects).toHaveLength(2);
  });

  it("scopes the cost replacement to the BT11-059 card number", () => {
    const into = compiled.effects[0]!.actions[0]!.into;
    expect(into).toEqual({ cardId: "BT11-059" });
    expect(definitionMatches(into, getCardDefinition("BT11-059") as never)).toBe(true);
    expect(definitionMatches(into, getCardDefinition("BT2-051") as never)).toBe(false);
    expect(definitionMatches(into, getCardDefinition("P-113") as never)).toBe(false);
    expect(definitionMatches(into, getCardDefinition("P-173") as never)).toBe(false);
  });

  it("0 Tamers pays the printed evoCost 5 (revert-equivalent baseline)", async () => {
    const { paid, evolved } = await paidToEvolveIntoBT11059([]);
    expect(evolved).toBe(true);
    expect(paid).toBe(5);
  });

  it("2 distinct green/black Tamers reduce the cost by 2 (5 - 2 = 3)", async () => {
    const { paid, evolved } = await paidToEvolveIntoBT11059(["BT1-088", "BT10-092"]); // 1 Green, 1 Black
    expect(evolved).toBe(true);
    expect(paid).toBe(3);
  });

  it("Q2092: one green+black DUAL-color Tamer counts as 1, reducing by exactly 1 (5 - 1 = 4)", async () => {
    const { paid, evolved } = await paidToEvolveIntoBT11059(["BT23-083"]); // dual Green+Black Tamer
    expect(evolved).toBe(true);
    // NOT 3 (would be the wrong double-count of a 2-color Tamer): exactly 1 reduction.
    expect(paid).toBe(4);
  });
});

describe("BT11-059 battle deletion trigger", () => {
  it("unsuspends only when RustTyrannomon itself deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-059", as: "rust", suspended: true },
          { card: "BT1-075", as: "other", suspended: true },
        ],
      },
    });

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("other").permanentId,
    });
    expect(s.perm("rust").isSuspended).toBe(true);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("rust").permanentId,
    });
    expect(s.perm("rust").isSuspended).toBe(false);
  });

  it("uses its battle-deletion trigger only once per turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-059", as: "rust", suspended: true }] } });
    const payload = { attackerPermanentId: s.perm("rust").permanentId };

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", payload);
    expect(s.perm("rust").isSuspended).toBe(false);

    s.perm("rust").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", payload);
    expect(s.perm("rust").isSuspended).toBe(true);
  });
});
