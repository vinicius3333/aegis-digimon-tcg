import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// EX5-074 (Fanglongmon) behavioral evidence: security trash scaling, trash recovery with
// per-card DP reduction, and the Digimon-effect immunity scope.

const FANGLONGMON = "EX5-074";
const FOUR_SOVS = "BT6-029"; // Azulongmon — [Four Sovereigns] Digimon
const DEVA = "BT10-079"; // Sandiramon — [Deva] Digimon
const VANILLA = "BT1-009"; // Monodramon — no trait, filler
const OPP_DIGIMON = "BT1-024"; // Koromon (Lv.2) → we'll set DP manually

describe("EX5-074 [When Attacking] trashes opponent security equal to owner's [Four Sovereigns] count", () => {
  it("with 2 own [Four Sovereigns] Digimon, trashes 2 opponent security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: FANGLONGMON, dp: 15000, as: "fanglongmon" },
            { card: FOUR_SOVS, dp: 12000 },
            { card: FOUR_SOVS, dp: 12000 },
          ],
        },
        1: {
          battleArea: [{ card: OPP_DIGIMON, as: "opponent", dp: 10000, suspended: true }],
          security: [VANILLA, VANILLA, VANILLA],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const secBefore = p1.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fanglongmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => p1.security.length === secBefore - 2);

    // 2 [Four Sovereigns] → exactly 2 security cards trashed while attacking a Digimon.
    expect(secBefore - p1.security.length).toBe(2);
  });

  it("does not trash security when no own [Four Sovereigns] Digimon are present", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: FANGLONGMON, as: "fanglongmon", dp: 15000 }] },
      1: {
        battleArea: [{ card: OPP_DIGIMON, as: "opponent", dp: 10000, suspended: true }],
        security: [VANILLA, VANILLA],
      },
    });
    const p1 = s.state.players[1] as PlayerState;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fanglongmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.battleArea.length === 0);
    expect(p1.security).toHaveLength(2);
  });
});

describe("EX5-074 [On Play] returns Deva/FourSovereigns from trash to deck, -4000 DP per card", () => {
  it("returning 2 qualifying cards → opponent Digimon DP reduced by 8000", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [
            { card: DEVA, as: "trashDeva" },
            { card: FOUR_SOVS, as: "trashFourSovs" },
          ],
          hand: [{ card: FANGLONGMON, as: "fanglongmon" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 10000, as: "oppDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    s.state.memory = 15; // Fanglongmon play cost

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fanglongmon").instanceId })).toEqual({
      ok: true,
    });

    // Both trash cards returned → DP drops by 8000.
    await settle(() => s.perm("oppDigimon").currentDP <= 10000 - 8000);

    expect(s.perm("oppDigimon").currentDP).toBe(2000);
    // Trash should now be empty (returned to deck bottom).
    expect(p0.trash.some((c) => c.instanceId === s.inst("trashDeva").instanceId)).toBe(false);
    expect(p0.trash.some((c) => c.instanceId === s.inst("trashFourSovs").instanceId)).toBe(false);
  });

  it("returns a qualifying card during an attack and applies its one-card DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FANGLONGMON, as: "fanglongmon", dp: 15000 }],
          trash: [{ card: DEVA, as: "trashDeva" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 20000, as: "oppDigimon", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fanglongmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("oppDigimon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("oppDigimon").currentDP === 16000);

    expect(s.perm("oppDigimon").currentDP).toBe(16000);
    expect(p0.trash.some((card) => card.instanceId === s.inst("trashDeva").instanceId)).toBe(false);
  });

  it("is unaffected by an opponent Digimon effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: FANGLONGMON, as: "fanglongmon", dp: 15000 }] },
        1: { hand: [{ card: "EX5-032", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    expect(observe(s.engine).hasRestriction(s.perm("fanglongmon"), "beAffected", "Digimon")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("attacker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-032"));

    expect(s.perm("fanglongmon").currentDP).toBe(15000);
  });
});
