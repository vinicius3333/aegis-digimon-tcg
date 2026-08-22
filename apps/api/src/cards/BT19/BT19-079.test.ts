import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// A3 for BT19-079 (Taiki Kudo) — DigiXros source-zone expander:
//   "[All Turns] When any of your [Xros Heart] Digimon with DigiXros would be played, by suspending
//    this Tamer, you may place cards from under your Tamers as DigiXros materials." (documented behavior.)
//
// FAILS-WHEN-REVERTED: the under-Tamer card is a legal DigiXros material ONLY because BT19-079's
// expansion (under-Tamer max = unlimited, gated on the played card being [Xros Heart]) is active.
// Without suspending BT19-079 the under-Tamer zone is locked (max 0) → the material is illegal and
// the DigiXros play is rejected. Proven both ways below.

const TAIKI = "BT19-079"; // the expander Tamer
const XROS_DIGIMON = "BT10-009"; // [Xros Heart] L4 DigiXros card, recipe incl. [Shoutmon]; cost 9
const SHOUTMON = "BT10-008"; // "Shoutmon" L3 — a legal material for XROS_DIGIMON

describe("BT19-079 DigiXros source-zone expansion (cards under Tamers)", () => {
  it("keeps memory reset, DigiXros expansion, and security play in the runtime record", () => {
    const card = runtimeCompiledCard(TAIKI);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] },
      {
        trigger: "AllTurns",
        optional: true,
        actions: [{ kind: "DigiXrosMaterialZoneExpansion", zones: ["digivolutionCards"] }],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
    ]);
  });

  it("with BT19-079 suspended, an under-Tamer [Shoutmon] is a legal DigiXros material", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: TAIKI, dp: 0, as: "tamer", under: [{ card: SHOUTMON, as: "under" }] }],
        hand: [{ card: XROS_DIGIMON, as: "xros" }],
      },
    });
    const p0 = s.state.players[0];
    s.state.memory = 7; // cost 9 - 1×2 = 7
    const tamerId = s.perm("tamer").permanentId;
    const underId = s.inst("under").instanceId;
    const xrosId = s.inst("xros").instanceId;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: xrosId,
      digiXros: { materialInstanceIds: [underId], expanderPermanentIds: [tamerId] },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0?.battleArea.some((perm) => perm.topCard?.cardId === XROS_DIGIMON) ?? false);

    const perm = p0?.battleArea.find((p) => p.topCard?.cardId === XROS_DIGIMON);
    expect(perm).toBeDefined();
    // The under-Tamer Shoutmon is now a digivolution card of the played Digimon...
    expect(perm?.stack.some((c) => c.instanceId === underId)).toBe(true);
    // ...and is no longer under the Tamer.
    expect(s.perm("tamer").stack.some((c) => c.instanceId === underId)).toBe(false);
    // BT19-079 was suspended as the activation cost.
    expect(s.perm("tamer").isSuspended).toBe(true);
    // Cost reduced by 2 (one material): 9 - 2 = 7 paid from memory 7 → 0.
    expect(s.state.memory).toBe(0);
  });

  it("without suspending BT19-079, the under-Tamer material is illegal → DigiXros rejected", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: TAIKI, dp: 0, under: [{ card: SHOUTMON, as: "under" }] }],
        hand: [{ card: XROS_DIGIMON, as: "xros" }],
      },
    });
    s.state.memory = 9;
    const underId = s.inst("under").instanceId;
    const xrosId = s.inst("xros").instanceId;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: xrosId,
      digiXros: { materialInstanceIds: [underId] }, // no expanderPermanentIds → zone locked
    });
    expect(res.ok).toBe(false);
  });
});
