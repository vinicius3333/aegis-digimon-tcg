/**
 * Base-granted digivolution paths (ST7-03 / ST8-04 / BT6-060): a static on the BASE permanent
 * lets a specific card in hand digivolve onto it, ignoring color/level, while active. Exercises the
 * real GameEngine binding (matchBaseGrantedDigivolve + the opponent-level activation condition).
 */
import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import "../cards/index.js";

const GALLANTMON = "BT12-018"; // exact name "Gallantmon", Lv.6
const BT21_040_TARGET = "BT13-018"; // exact name "ShineGreymon", Lv.6
const GALLANTMON_CRIMSON = "BT17-018"; // "Gallantmon: Crimson Mode" — NOT exact "Gallantmon"
const OPP_LV6 = "AD1-004"; // WarGreymon, Lv.6
const OPP_LOW = "BT1-009"; // Lv.3
const THREE_MUSKETEERS = "BT25-085"; // BeelStarmon, [Three Musketeers], Lv.6

describe("base-granted digivolution (ST7-03 / BT6-060)", () => {
  it("BT21-040: uses the real base grant for a hand ShineGreymon on the owner's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-040", as: "base" }],
          hand: [{ card: BT21_040_TARGET, as: "evo" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: OPP_LV6 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("evo").instanceId, {
      payCost: true,
    });
    await settle(() => s.perm("base").topCard.cardId === BT21_040_TARGET);
    expect(s.perm("base").topCard.cardId).toBe(BT21_040_TARGET);
    expect(s.state.memory).toBe(0);
  });

  it.each([true, false])(
    "BT21-040: does not use its hand-only grant for the same card in trash (payCost=%s)",
    async (payCost) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-040", as: "base" }],
            trash: [{ card: BT21_040_TARGET, as: "evo" }],
            deck: ["BT1-009"],
          },
          1: { battleArea: [{ card: OPP_LV6 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 4;
      await s.ready();
      await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("evo").instanceId, {
        payCost,
      });
      expect(s.perm("base").topCard.cardId).toBe("BT21-040");
      expect(s.state.memory).toBe(4);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("evo").instanceId)).toBe(true);
    },
  );

  it.each([true, false])(
    "BT21-040: does not use its Your Turn grant while the opponent owns the turn (payCost=%s)",
    async (payCost) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-040", as: "base" }],
            hand: [{ card: BT21_040_TARGET, as: "evo" }],
            deck: ["BT1-009"],
          },
          1: { battleArea: [{ card: OPP_LV6 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 4;
      await s.ready();
      await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("evo").instanceId, {
        payCost,
      });
      expect(s.perm("base").topCard.cardId).toBe("BT21-040");
      expect(s.state.memory).toBe(4);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evo").instanceId)).toBe(true);
    },
  );

  it.each([true, false])(
    "BT21-040: BT8-059 blocks the base-granted ignore-requirements permission (payCost=%s)",
    async (payCost) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-040", as: "base" }],
            hand: [{ card: BT21_040_TARGET, as: "evo" }],
            deck: ["BT1-009"],
          },
          1: { battleArea: [{ card: "BT8-059", as: "lock" }, { card: OPP_LV6 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 4;
      await s.ready();
      await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("evo").instanceId, {
        payCost,
      });
      expect(s.perm("base").topCard.cardId).toBe("BT21-040");
      expect(s.state.memory).toBe(4);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evo").instanceId)).toBe(true);
    },
  );

  it("ST7-03: [Gallantmon] digivolves onto this Guilmon while opponent has a Lv.6+ Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-03", as: "base" }],
          hand: [{ card: GALLANTMON, as: "evo" }],
          deck: Array(5).fill("BT1-009"),
        },
        1: { battleArea: [{ card: OPP_LV6, dp: 5000 }] }, // condition holder
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8; // affords the cost-4 / cost-6 granted digivolves
    const base = s.perm("base");
    const evo = s.inst("evo");

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evo.instanceId,
    } as never) as { ok: boolean };
    expect(res.ok).toBe(true);
    await settle(() => false, 60);
    expect(base.topCard.cardId).toBe(GALLANTMON);
  });

  it("ST7-03: rejected when the opponent has NO Lv.6+ Digimon (activation condition fails)", () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-03", as: "base" }],
          hand: [{ card: GALLANTMON, as: "evo" }],
          deck: Array(5).fill("BT1-009"),
        },
        1: { battleArea: [OPP_LOW] }, // only a low-level Digimon
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const base = s.perm("base");
    const evo = s.inst("evo");

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evo.instanceId,
    } as never) as { ok: boolean };
    expect(res.ok).toBe(false);
  });

  it("ST7-03: rejected for a near-name [Gallantmon: Crimson Mode] (exact-name target gate)", () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-03", as: "base" }],
          hand: [{ card: GALLANTMON_CRIMSON, as: "evo" }],
          deck: Array(5).fill("BT1-009"),
        },
        1: { battleArea: [{ card: OPP_LV6, dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const base = s.perm("base");
    const evo = s.inst("evo");

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evo.instanceId,
    } as never) as { ok: boolean };
    expect(res.ok).toBe(false);
  });

  it("BT6-060: a [Three Musketeers] Digimon digivolves onto this for 6 (no opponent condition)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-060", as: "base" }],
          hand: [{ card: THREE_MUSKETEERS, as: "evo" }],
          deck: Array(5).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const base = s.perm("base");
    const evo = s.inst("evo");

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evo.instanceId,
    } as never) as { ok: boolean };
    expect(res.ok).toBe(true);
    await settle(() => false, 60);
    expect(base.topCard.cardId).toBe(THREE_MUSKETEERS);
  });
});
