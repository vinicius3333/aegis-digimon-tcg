import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-102.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";

// A3 for BT17-102 (Greymon, White Lv.4):
//   [When Digivolving] If this Digimon's name is [Koromon], it gains +3000 DP for the
//     turn. Then, delete 1 of your opponent's Digimon with as much or less DP as this
//     Digimon. (KB Q4713: delete fires even if Koromon condition is not met)
//   [All Turns] gains the names of level 3 and lower cards in its stack.
//   [On Deletion] You may play 1 Tamer with [Tai Kamiya] or [Kari Kamiya] in its name
//     from your hand without paying cost, OR hatch in your breeding area.
//
// Test: [When Digivolving] deletes an opponent Digimon with DP ≤ Greymon's DP (5000).

const GREYMON = "BT17-102";
// Lv.3 Agumon (Red) — a valid digivolve base for BT17-102 ("from Lv.3 w/ [Agumon] in name, cost 2").
const AGUMON_LV3 = "BT1-010";

describe("BT17-102 Greymon — [When Digivolving] delete opponent Digimon (KB Q4713)", () => {
  it("declares the catalogued alternate Lv.3 Agumon-in-name route", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, names: ["Agumon"], cost: 2, isAlternate: true }]);
    expect(runtimeCompiledCard(GREYMON)?.digivolutionRequirement).toEqual([
      { level: 3, names: ["Agumon"], cost: 2, isAlternate: true },
    ]);
  });

  it("keeps the delete clause independent from the Koromon-only DP boost", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: expect.arrayContaining([expect.objectContaining({ kind: "Delete" })]),
    });
  });

  it("[When Digivolving] deletes 1 opponent Digimon with DP ≤ Greymon's 5000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          // Lv.3 Agumon as the digivolve base for p0.
          battleArea: [{ card: AGUMON_LV3, dp: 1000, as: "agumon" }],
          // Greymon in p0's hand; digivolve onto Agumon (cost 2, p0 needs ≥2 memory).
          hand: [{ card: GREYMON, as: "greymon" }],
        },
        // Opponent has a Digimon with DP ≤ 5000 — eligible to be deleted. (BT1-009 Monodramon —
        // BT1-007 Tanemon is a DigiEgg, not a Digimon, and can never satisfy the [Digimon]-kind
        // filter this effect requires.)
        1: { battleArea: [{ card: "BT1-009", dp: 4000, as: "oppTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0];
    const p1 = s.state.players[1];
    s.state.turnSeat = 0;
    s.state.memory = 2;
    const agumonId = s.perm("agumon").permanentId;
    const greymonId = s.inst("greymon").instanceId;
    const oppPermId = s.perm("oppTarget").permanentId;

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: greymonId,
      permanentId: agumonId,
      useAlternateCost: true,
    });
    expect(res.ok).toBe(true);

    // Wait for Greymon to leave p0's hand (digivolve completed).
    await settle(() => !p0?.hand.some((c) => c.instanceId === greymonId), 600);

    // Wait for the [When Digivolving] effect: opponent's target Digimon should be deleted.
    await settle(() => !p1?.battleArea.some((p) => p.permanentId === oppPermId), 800);

    // The opponent's Digimon with 4000 DP (≤ Greymon's 5000 DP) was deleted.
    expect(p1?.battleArea.some((p) => p.permanentId === oppPermId)).toBe(false);
  });

  it("naturally plays a Tai/Kari Tamer when the Greymon host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: GREYMON,
              suspended: true,
              as: "greymon",
              dp: 5000,
              under: [{ card: AGUMON_LV3, as: "agumon" }],
            },
          ],
          hand: [{ card: "BT17-093", as: "taiKari" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 12000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0];
    s.state.turnSeat = 1;
    s.state.memory = 0;

    const result = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("greymon").permanentId },
    });
    expect(result.ok).toBe(true);

    await settle(() => p0?.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-093"), 1200);
    expect(p0?.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-093")).toBe(true);
  });

  it("naturally hatches when the optional Tai/Kari Tamer branch has no candidate", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT14-001", as: "egg" }],
          battleArea: [
            {
              card: GREYMON,
              suspended: true,
              as: "greymon",
              dp: 5000,
              under: [{ card: AGUMON_LV3, as: "agumon" }],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 12000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0];
    s.state.turnSeat = 1;
    s.state.memory = 0;

    const result = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("greymon").permanentId },
    });
    expect(result.ok).toBe(true);

    await settle(() => p0?.breeding !== undefined, 1200);
    expect(p0?.breeding?.topCard?.cardId).toBe("BT14-001");
  });
});

describe("BT17-102 Greymon — dynamic stack names", () => {
  it("has the names of level 3 and lower cards in its stack, including (Rule) aliases", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: GREYMON,
            as: "greymon",
            under: [
              { card: AGUMON_LV3, as: "agumon" },
              { card: "BT14-001", as: "koromon" },
            ],
          },
        ],
      },
      1: {},
    });
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("greymon"))).toEqual(
      expect.arrayContaining(["greymon", "agumon", "koromon"]),
    );
  });

  it("uses a Koromon stack alias for the +3000 DP gate on a natural digivolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: AGUMON_LV3,
              as: "agumon",
              under: [{ card: "BT14-001", as: "koromon" }],
            },
          ],
          hand: [{ card: GREYMON, as: "greymon" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "boostBoundary" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0];
    const p1 = s.state.players[1];
    s.state.turnSeat = 0;
    s.state.memory = 2;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("agumon").permanentId,
      instanceId: s.inst("greymon").instanceId,
      useAlternateCost: true,
    });
    expect(result.ok).toBe(true);

    await settle(() => p0?.battleArea.some((permanent) => permanent.topCard?.cardId === GREYMON), 1000);
    await settle(() => p1?.battleArea.length === 0, 1000);
    expect(p0?.battleArea.some((permanent) => permanent.topCard?.cardId === GREYMON)).toBe(true);
    expect(p1?.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
  });
});
