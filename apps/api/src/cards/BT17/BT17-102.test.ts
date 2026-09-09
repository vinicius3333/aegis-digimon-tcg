import { describe, it, expect } from "vitest";
import { Phase } from "@aegis/shared";
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

  it("offers exactly one On Deletion recovery choice: play a Tamer or hatch", () => {
    for (const effect of compiled.effects?.filter((entry) => entry.trigger === "OnDeletion") ?? []) {
      expect(effect.actions).toEqual([
        expect.objectContaining({
          kind: "Modal",
          choose: 1,
          optional: true,
          options: [
            [expect.objectContaining({ kind: "PlayWithoutCost" })],
            [expect.objectContaining({ kind: "Hatch" })],
          ],
        }),
      ]);
    }
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
          eggDeck: [{ card: "BT14-001", as: "unusedEgg" }],
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
    expect(p0?.breeding).toBeUndefined();
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
      // Prefer the first offered entry: the unavailable Tamer branch must be filtered,
      // leaving Hatch as the only selectable option.
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
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

describe("BT17-102 Greymon — evolution routes", () => {
  it("takes the printed Lv.3 Agumon route for 2 memory and draws the digivolve card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: AGUMON_LV3, as: "agumon" }],
        hand: [{ card: GREYMON, as: "greymon" }],
        deck: ["BT1-012", "BT1-009"],
      },
      1: {},
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard?.cardId === GREYMON);

    const p0 = s.state.players[0]!;
    expect(s.state.memory).toBe(3);
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual([AGUMON_LV3]);
    expect(p0.hand.map((card) => card.cardId)).toEqual(["BT1-012"]);
    expect(p0.deck.length).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("takes the catalog colour route for its full 3 memory when the alternate cost is not used", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: AGUMON_LV3, as: "agumon" }],
        hand: [{ card: GREYMON, as: "greymon" }],
        deck: ["BT1-012", "BT1-009"],
      },
      1: {},
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard?.cardId === GREYMON);

    expect(s.state.memory).toBe(2);
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual([AGUMON_LV3]);
  });

  it("does not grant the 2-memory route to a Lv.3 without [Agumon] in its name", async () => {
    const s = setupEngine({
      0: {
        // Monodramon is Lv.3 Red, so the catalog colour route is legal but the printed
        // [Digivolve] route (Lv.3 w/[Agumon] in its name) must not be.
        battleArea: [{ card: "BT1-009", as: "monodramon" }],
        hand: [{ card: GREYMON, as: "greymon" }],
        deck: ["BT1-012"],
      },
      1: {},
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    // `useAlternateCost` only selects the printed route when that route actually matches
    // the base; Monodramon fails the [Agumon]-in-name gate, so the digivolve falls back
    // to the catalog Red Lv.3 route at its full 3 memory.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monodramon").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("monodramon").topCard?.cardId === GREYMON);

    expect(s.state.memory).toBe(2);
    expect(s.perm("monodramon").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });
});

describe("BT17-102 Greymon — [When Digivolving] boundaries (KB Q4713, Q2902)", () => {
  it("leaves an opponent Digimon above its DP alive and grants no DP without a [Koromon] name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: AGUMON_LV3, as: "agumon" }],
          hand: [{ card: GREYMON, as: "greymon" }],
          deck: ["BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 6000, as: "tooBig" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard?.cardId === GREYMON);

    // No [Koromon] in the stack: the DP boost half of the clause does nothing, so the
    // 6000 DP opponent stays above Greymon's printed 5000 DP and survives.
    expect(s.perm("agumon").currentDP).toBe(5000);
    expect(s.state.players[1]?.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooBig").permanentId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("applies the +3000 DP only for the turn and names the digivolved Digimon [Greymon]/[Agumon] (Q2902)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: AGUMON_LV3, as: "agumon", under: [{ card: "BT14-001", as: "koromon" }] }],
          hand: [{ card: GREYMON, as: "greymon" }],
          deck: ["BT1-012"],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").currentDP === 8000);

    expect(s.perm("agumon").currentDP).toBe(8000);
    expect(observe(s.engine).effectiveNames(s.perm("agumon"))).toEqual(
      expect.arrayContaining(["greymon", "agumon", "koromon"]),
    );
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(["BT14-001", AGUMON_LV3]);
  });
});

describe("BT17-102 Greymon — [All Turns] names survive the breeding move (KB Q2901, Q2903)", () => {
  it("keeps the stack-granted names when the Digimon moves from breeding to the battle area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: GREYMON, as: "greymon", under: [{ card: "BT14-001" }, { card: AGUMON_LV3 }] },
        deck: ["BT1-012"],
      },
      1: {},
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("greymon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]?.breeding === undefined);

    const moved = s.perm("greymon");
    expect(s.state.players[0]?.battleArea.map((permanent) => permanent.permanentId)).toEqual([moved.permanentId]);
    // Q2901: the moved Digimon is the one carrying [Greymon]/[Agumon]/[Koromon].
    expect(observe(s.engine).effectiveNames(moved)).toEqual(expect.arrayContaining(["greymon", "agumon", "koromon"]));
  });
});

describe("BT17-102 Greymon — [On Deletion] optionality and inheritance (KB Q5965)", () => {
  it("does nothing when the controller declines the optional [On Deletion] effect", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT14-001", as: "egg" }],
          battleArea: [{ card: GREYMON, suspended: true, as: "greymon", dp: 5000, under: [{ card: AGUMON_LV3 }] }],
          hand: [{ card: "BT17-093", as: "taiKari" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 12_000, as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("greymon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.some((card) => card.cardId === GREYMON), 1200);

    expect(p0.battleArea.length).toBe(0);
    expect(p0.breeding).toBeUndefined();
    expect(p0.hand.map((card) => card.cardId)).toEqual(["BT17-093"]);
    expect(p0.eggDeck.length).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires the inherited [On Deletion] from underneath a higher-level Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT14-001", as: "egg" }],
          battleArea: [
            {
              card: "BT1-024",
              suspended: true,
              as: "host",
              dp: 5000,
              under: [{ card: AGUMON_LV3 }, { card: GREYMON }],
            },
          ],
          hand: [{ card: "BT17-093", as: "taiKari" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 12_000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0]!;
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-093"), 1200);

    expect(p0.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT17-093"]);
    expect(p0.hand.length).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
