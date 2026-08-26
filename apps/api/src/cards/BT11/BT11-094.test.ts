import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT11-094.js";

// A3 for BT11-094 (Mirei Mikagura — Purple Tamer).
//
// [Start of Your Turn] Gain 1 memory.
//
// [Your Turn] When one of your Digimon digivolves into [Angewomon] or [LadyDevimon],
// if you have 1 or fewer Digimon in play, by suspending this Tamer, you may play 1
// [Angewomon] or [LadyDevimon] with a DIFFERENT name than the Digimon you digivolved
// into from your hand without paying the cost.
// (Q2122/Q2123: digivolves into Angewomon → play LadyDevimon; cannot play same name.)
//
// FAILS-WHEN-REVERTED:
//   Test 1 — [Start of Your Turn]: memory increased by 1.
//   Test 2 — [Your Turn]: digivolve into Angewomon → Mirei suspends and LadyDevimon
//     is played from hand for free.
//
// Cards:
//   BT11-094  — Mirei Mikagura (the Tamer, Purple; playCost 4)
//   BT11-042  — Angewomon (Yellow+Purple Lv.5; evoCost: Yellow Lv.4 @ 3, Purple Lv.4 @ 3)
//   BT11-083  — LadyDevimon (Purple+Yellow Lv.5; evoCost: Purple Lv.4 @ 3, Yellow Lv.4 @ 3)
//   BT10-074  — Quetzalmon (Purple Lv.4) — digivolve base for Angewomon (Purple Lv.4 @ 3)
//   BT1-001   — filler

describe("BT11-094 Mirei Mikagura", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-094")).toMatchObject({ cardId: "BT11-094", colors: ["Purple", "Yellow"], kinds: ["Tamer"], playCost: 5 });
    expect(compiled.effects).toMatchObject([
      { trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", amount: 1 }] },
      { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" }, { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("[Start of Your Turn] gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          // Mirei on the battle area.
          battleArea: [{ card: "BT11-094", dp: 0, as: "mireiPerm" }],
          // Deck fodder for draw phase.
          deck: Array.from({ length: 5 }, () => "BT1-001"),
          // A playable hand card prevents the engine from auto-ending Main phase.
          hand: ["AD1-001"],
        },
        1: { deck: Array.from({ length: 5 }, () => "BT1-001") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const _mireiPerm = s.perm("mireiPerm");

    s.state.memory = 3;
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = true;

    // OnStartTurn only fires through the real turn loop.
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();

    // Mirei's [Start of Your Turn] gain 1 memory should have raised memory by 1.
    expect(s.state.memory).toBe(4);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("[Your Turn] digivolving into Angewomon suspends Mirei and plays LadyDevimon from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Mirei on the battle area (not suspended).
            { card: "BT11-094", dp: 0, as: "mireiPerm" },
            // A Purple Lv.4 Digimon as the digivolve base for Angewomon.
            // BT11-042 Angewomon evoCost: Purple Lv.4 @ 3
            { card: "BT10-074", dp: 2000, as: "base" },
          ],
          deck: ["BT1-001"], // draw fodder
          hand: [
            // Angewomon in hand (will be digivolved onto base).
            { card: "BT11-042", as: "angewomon" },
            // LadyDevimon in hand (the "other" name — Q2122/Q2123: play LadyDevimon when digivolving into Angewomon).
            { card: "BT11-083", as: "ladyDevimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const mireiPerm = s.perm("mireiPerm");
    const base = s.perm("base");
    const angewomon = s.inst("angewomon");
    const ladyDevimon = s.inst("ladyDevimon");

    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: angewomon.instanceId,
    });

    expect(result).toEqual({ ok: true });

    // After digivolving into Angewomon, Mirei suspends and LadyDevimon is played.
    await settle(() => mireiPerm.isSuspended);

    expect(mireiPerm.isSuspended).toBe(true);

    // LadyDevimon should now be on the battle area (played from hand for free).
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT11-083"));

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT11-083")).toBe(true);
    // LadyDevimon no longer in hand.
    expect(p0.hand.some((c) => c.instanceId === ladyDevimon.instanceId)).toBe(false);
  });

  it("does not suspend or play a same-name counterpart", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-094", as: "mirei" },
            { card: "BT10-074", as: "base" },
          ],
          hand: [
            { card: "BT11-042", as: "evolving" },
            { card: "BT11-042", as: "same-name" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-042");

    expect(s.perm("mirei").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("same-name").instanceId)).toBe(true);
  });
});
