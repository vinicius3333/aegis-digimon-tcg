import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import "../BT3/BT3-014.js";
// Self-registers every card module (boot side-effect) so the engine can look up
// BT9-074's [On Deletion] effect.
import { compiled } from "./BT9-074.js";

/**
 * A3 for BT9-074 — [On Deletion] (inherited) "If this Digimon has 2 or more colors, gain
 * 2 memory."
 *
 * [On Deletion] is unrestricted-turn: this Digimon can be deleted on EITHER player's
 * turn (e.g. losing a battle when the OPPONENT attacks it), so `turnSeat` at the moment
 * of deletion is not necessarily this card's own controller. `ctx.fx.gainMemory` credits
 * `state.turnSeat`, which is wrong whenever the deletion happens on the opponent's turn.
 *
 * FAILS-WHEN-REVERTED: reverting `ctx.fx.gainMemoryForSeat(source.ownerSeat, 2)` back to
 * `ctx.fx.gainMemory(2)` flips this test's memory assertions (the attacker, not
 * BT9-074's own controller, would gain the memory).
 */
describe("BT9-074 [On Deletion] gain 2 memory credits its OWNER, not the attacking turn player", () => {
  it("matches catalog and Q1868 security and inherited IR", () => {
    expect(getCardDefinition("BT9-074")).toMatchObject({
      cardId: "BT9-074",
      nameEn: "Meicoomon",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Unknown"],
      types: ["Unknown"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Security",
          timing: "endOfBattle",
          isSecurity: true,
          actions: [
            {
              kind: "SubTrigger",
              event: "whenSecurityBattleEnded",
              once: true,
              actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
            },
          ],
        },
        {
          trigger: "OnDeletion",
          isInherited: true,
          actions: [{ kind: "GainMemory", amount: 2, condition: { kind: "selfColorCount", op: "gte", value: 2 } }],
        },
      ],
    });
  });

  it("battles as a Security Digimon before playing itself at end of battle for no cost", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT14-031", as: "attacker", dp: 500 }] },
        1: { security: [{ card: "BT9-074", as: "securityMeicoomon" }] },
      },
      { autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityMeicoomon").instanceId;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-031")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    const checked = s.events.findIndex((event) => event.kind === "securityChecked");
    const played = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT9-074");
    expect(s.events[checked]).toMatchObject({ kind: "securityChecked", resolution: "battle" });
    expect(played).toBeGreaterThan(checked);
    assertNoLoudGap(s);
  });

  it("deleted in battle on the OPPONENT's turn; the memory goes to BT9-074's own controller", async () => {
    // "(inherited)" effects only fire while the card is a DIGIVOLUTION-STACK card under
    // another Digimon (engine/effects/kernel.ts passesPlacementGuard) -- not while it is
    // a permanent's own top card. So BT9-074 must die as MATERIAL under a host Digimon,
    // which loses the upcoming battle with low DP. It is seat 1's turn; seat 1 attacks it
    // directly.
    const s = setup(
      {
        0: {
          battleArea: [
            {
              card: "BT9-076",
              dp: 1000,
              as: "target",
              suspended: true, // a permanent-target attack requires a suspended defender
              under: [{ card: "BT9-074", as: "material" }],
            },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }] },
      },
      { autoOrderTriggers: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    s.state.turnSeat = 1;
    const target = s.perm("target");
    const material = s.inst("material");
    const attacker = s.perm("attacker");

    // memoryFor mirrors MemoryGauge.memoryFor: state.memory is stored relative to
    // turnSeat, so reading a seat's own-perspective value must account for whose turn
    // it is -- asserting on the raw sign of state.memory would silently pass for
    // whichever seat happens to be turnSeat, which is exactly the bug being caught here.
    const memoryFor = (seat: 0 | 1): number => (seat === s.state.turnSeat ? s.state.memory : -s.state.memory) || 0; // normalize -0 -> 0
    expect(memoryFor(0)).toBe(0);
    expect(memoryFor(1)).toBe(0);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: target.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p0.battleArea.some((p) => p.permanentId === target.permanentId));
    await settle(() => memoryFor(0) !== 0 || memoryFor(1) !== 0, 60);

    // BT9-074 actually died (moved to trash) along with its host.
    expect(p0.trash.some((c) => c.instanceId === material.instanceId)).toBe(true);

    // BT9-074's own controller (seat 0) gains the memory -- not seat 1, even though
    // seat 1 is turnSeat when the deletion happens.
    expect(memoryFor(0)).toBe(2);
    expect(memoryFor(1)).toBe(-2);
    assertNoLoudGap(s);
  });

  it("does not gain memory when its deleted host has only 1 color", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "AD1-001", as: "host", under: [{ card: "BT9-074", as: "material" }] }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 0;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId])).toBe(1);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("material").instanceId));

    expect(s.state.memory).toBe(0);
  });

  it("counts a color granted to the host before deletion", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT3-014", as: "host", under: [{ card: "BT9-074", as: "material" }] }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId])).toBe(1);
    await settle(() => s.state.memory === 2);

    expect(s.state.memory).toBe(2);
  });
});
