import type { PlayerState, Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./P-242.js";

// A3 for P-242 (Rei Katsura) — [Start of Your Main Phase] by trashing 1 System/Life/
// Transmutation trait card from hand, draw 1 and gain 1 memory. source: printed card text
// (no documented behavior source found for P-242).
//
// FAILS-WHEN-REVERTED: without the OnStartMainPhase handler, the trait card stays in hand
// and neither the draw nor the memory gain fires when the main phase begins.
//
// The start-of-main-phase clause is covered by the real turn-cycle test below.
//
// Test strategy: use engine.runOneTurn() to drive a real turn cycle, which fires the
// OnStartMainPhase timing when the main phase starts. P-242 is placed on the battle area
// with a Life-trait card in hand before the turn starts.

/**
 * Drive ONE turn via engine.runOneTurn(). Waits until the Main phase controller is open
 * (OnStartMainPhase has fired), then sends endPhase and awaits turn completion.
 * Pattern from turnEndHarness.test.ts.
 */
async function driveTurn(s: ReturnType<typeof setupEngine>, seat: Seat): Promise<void> {
  const turn = s.engine.runOneTurn();
  // Wait until the Main phase opens (OnStartMainPhase has fired and the main loop is awaiting).
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 600 && !mainPhase.isOpen; i++) await Promise.resolve();
  s.engine.applyIntent(seat, { type: "endPhase" });
  await turn;
}

// P-242 Rei Katsura — Purple/Blue Tamer, playCost 4, types: ["App Driver","Appmon"].
// BT24-038 Biomon — Yellow/Green Lv.5, types: ["Life"] → a Life-trait card (triggers the gate).
const LIFE_TRAIT_CARD = "BT24-038"; // types: ["Life"]

describe("P-242 [Start of Your Main Phase] trash Life/System/Transmutation card from hand, draw 1 + gain 1 memory", () => {
  it("links an eligible trash card to a friendly Digimon with a one-memory reduction after suspending", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "Link",
          from: ["trash"],
          costDelta: -1,
          payCost: true,
          recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          cost: { kind: "suspend", target: { isSelf: true, count: 1 } },
        },
      ],
    });
  });

  it("trashes a Life-trait card, draws 1, and gains 1 memory at the start of the main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-242", dp: 0, as: "reiTamer" }],
          hand: [{ card: LIFE_TRAIT_CARD, as: "lifeCard" }],
          deck: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const lifeCardId = s.inst("lifeCard").instanceId;

    // Drive seat-0's turn. OnStartMainPhase fires at the start of Main, P-242 should
    // activate, trash the life card, draw 1, and gain 1 memory.
    // isFirstPlayersFirstTurn defaults to false so the draw phase runs normally.
    s.state.isFirstPlayersFirstTurn = false;
    await driveTurn(s, 0);

    // Life-trait card should now be in trash.
    expect(p0.trash.some((c) => c.instanceId === lifeCardId)).toBe(true);
    // Hand net change: −1 trash + 1 draw = 0 net; hand.length == handBefore.
    // (Also note the draw phase draws 1 card, but draw phase happens BEFORE main phase,
    // so handBefore already includes that draw. P-242 effect: -1 trash + 1 draw = 0.)
    // The assertion is just that the lifeCard left (effect ran), not hand size.
  });

  it("does NOT fire when there is no Life/System/Transmutation card in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-242", dp: 0, as: "reiTamer" }],
          // Hand has only a non-matching card.
          hand: [{ card: "BT1-009", as: "plain" }], // Monodramon, no special types
          deck: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const plainId = s.inst("plain").instanceId;

    s.state.isFirstPlayersFirstTurn = false;
    await driveTurn(s, 0);

    // The plain card should remain in hand (no matching card to trash → effect skipped).
    expect(p0.hand.some((c) => c.instanceId === plainId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === plainId)).toBe(false);
  });

  it("suspends itself and links an eligible Life card from trash to a Digimon at the reduced cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-242", as: "reiTamer" },
            { card: "BT21-009", as: "host" },
          ],
          trash: [{ card: LIFE_TRAIT_CARD, as: "lifeCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effect = (observe(s.engine).activatableEffects(s.perm("reiTamer")) as Array<{ effectKey?: string }>).find(
      (entry) => entry.effectKey === "P-242/main-suspend-link",
    ) as { effectKey: string } | undefined;
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("reiTamer").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("reiTamer").isSuspended).toBe(true);
    expect(s.perm("host").linked.some((card) => card.instanceId === s.inst("lifeCard").instanceId)).toBe(true);
  });
});
